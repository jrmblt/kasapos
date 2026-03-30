import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EarnPointsDto } from "./dto/earn-points.dto";
import { RedeemPointsDto } from "./dto/redeem-points.dto";

// config shape ที่เก็บใน tenant.settings.loyalty
interface LoyaltyConfig {
  enabled: boolean;
  earnRate: number; // แต้มที่ได้
  earnPer: number; // ทุก earnPer บาท ได้ earnRate แต้ม
  redeemRate: number; // 1 แต้ม = redeemRate บาท
  minRedeemPoints: number; // ใช้ขั้นต่ำ
  pointExpireMonths: number | null;
}

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) { }

  // ── Earn points หลัง order complete ──────────────────
  async earn(tenantId: string, dto: EarnPointsDto) {
    const config = await this.getConfig(tenantId);
    if (!config.enabled) return null;

    // หาเบอร์โทร — จาก dto หรือจาก order.customerPhone
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, branch: { tenantId } },
      select: { id: true, total: true, customerPhone: true, status: true },
    });
    if (!order) throw new NotFoundException("ไม่พบออเดอร์");
    if (order.status !== "COMPLETED") {
      throw new BadRequestException("order ต้อง COMPLETED ก่อน earn แต้ม");
    }

    const phone = dto.phone ?? order.customerPhone;
    if (!phone) throw new BadRequestException("ไม่พบเบอร์โทรสำหรับสะสมแต้ม");

    // เช็คว่า earn แล้วหรือยัง
    const alreadyEarned = await this.prisma.pointTransaction.findFirst({
      where: { orderId: dto.orderId, type: "EARN" },
    });
    if (alreadyEarned) {
      throw new BadRequestException("earn แต้มสำหรับออเดอร์นี้แล้ว");
    }

    // คำนวณแต้ม
    const amount = Number(order.total);
    const basePoints = Math.floor(amount / config.earnPer) * config.earnRate;

    if (basePoints <= 0) return null;

    return this.prisma.$transaction(async (tx) => {
      // upsert loyalty account
      const account = await this.upsertAccount(tx, tenantId, phone);

      // คำนวณ multiplier จาก tier
      const multiplier = await this.getTierMultiplier(tx, account.tierId);
      const finalPoints = Math.floor(basePoints * multiplier);
      const newBalance = account.points + finalPoints;
      const newTotal = account.totalEarned + finalPoints;
      const newSpend = Number(account.totalSpend) + amount;

      // อัป account
      const updatedAccount = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: newBalance,
          totalEarned: newTotal,
          totalSpend: newSpend,
          visitCount: { increment: 1 },
          lastVisitAt: new Date(),
          expiresAt: config.pointExpireMonths
            ? new Date(
              Date.now() +
              config.pointExpireMonths * 30 * 24 * 60 * 60 * 1000,
            )
            : undefined,
        },
      });

      // บันทึก transaction
      await tx.pointTransaction.create({
        data: {
          accountId: account.id,
          orderId: dto.orderId,
          type: "EARN",
          delta: finalPoints,
          balance: newBalance,
          note: `ยอดซื้อ ฿${amount.toFixed(2)} × ${multiplier}`,
        },
      });

      // อัป tier ถ้าถึงเกณฑ์ใหม่
      const newTier = await this.recalculateTier(tx, tenantId, newTotal);
      if (newTier && newTier.id !== account.tierId) {
        await tx.loyaltyAccount.update({
          where: { id: account.id },
          data: { tierId: newTier.id },
        });
      }

      return {
        phone,
        pointsEarned: finalPoints,
        balance: newBalance,
        multiplier,
        tier: newTier,
      };
    });
  }

  // ── Redeem points ─────────────────────────────────────
  async redeem(tenantId: string, dto: RedeemPointsDto) {
    const config = await this.getConfig(tenantId);
    if (!config.enabled) {
      throw new BadRequestException("ระบบสะสมแต้มปิดอยู่");
    }
    if (dto.points < config.minRedeemPoints) {
      throw new BadRequestException(`ใช้แต้มขั้นต่ำ ${config.minRedeemPoints} แต้ม`);
    }

    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { tenantId, phone: dto.phone },
    });
    if (!account) throw new NotFoundException("ไม่พบบัญชีสะสมแต้ม");
    if (account.points < dto.points) {
      throw new BadRequestException(`แต้มไม่พอ (มี ${account.points} แต้ม)`);
    }

    // เช็คว่า order ยังไม่มีการ redeem
    const alreadyRedeemed = await this.prisma.pointTransaction.findFirst({
      where: { orderId: dto.orderId, type: "REDEEM" },
    });
    if (alreadyRedeemed) {
      throw new BadRequestException("ใช้แต้มสำหรับออเดอร์นี้แล้ว");
    }

    const discountAmt = dto.points * config.redeemRate;
    const newBalance = account.points - dto.points;

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: newBalance },
      }),
      this.prisma.pointTransaction.create({
        data: {
          accountId: account.id,
          orderId: dto.orderId,
          type: "REDEEM",
          delta: -dto.points,
          balance: newBalance,
          note: `ใช้ ${dto.points} แต้ม ลด ฿${discountAmt}`,
        },
      }),
      // อัป discount ใน order
      this.prisma.order.update({
        where: { id: dto.orderId },
        data: {
          discountAmt: discountAmt,
          discountNote: `ใช้ ${dto.points} แต้ม`,
          total: { decrement: discountAmt },
        },
      }),
    ]);

    return {
      pointsUsed: dto.points,
      discountAmt,
      newBalance,
    };
  }

  // ── ดูประวัติและยอดแต้ม ───────────────────────────────
  async getAccount(tenantId: string, phone: string) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { tenantId, phone },
      include: {
        tier: {
          select: { name: true, color: true, multiplier: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            type: true,
            delta: true,
            balance: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });
    if (!account) throw new NotFoundException("ไม่พบบัญชีสะสมแต้ม");

    // หา tier ถัดไป
    const nextTier = await this.getNextTier(tenantId, account.totalEarned);

    return {
      phone: account.phone,
      points: account.points,
      totalEarned: account.totalEarned,
      totalSpend: account.totalSpend,
      visitCount: account.visitCount,
      tier: account.tier,
      nextTier,
      transactions: account.transactions,
    };
  }

  // ── ดู tiers ทั้งหมดของ tenant ───────────────────────
  async getTiers(tenantId: string) {
    return this.prisma.loyaltyTierConfig.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
  }

  // ── Public: ดูแต้มผ่าน receipt QR ────────────────────
  async getAccountByOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        customerPhone: true,
        branch: { select: { tenantId: true } },
      },
    });
    if (!order?.customerPhone) return null;

    return this.getAccount(order.branch.tenantId, order.customerPhone).catch(
      () => null,
    ); // ถ้าไม่มี account → return null แทน throw
  }

  // ── Private helpers ───────────────────────────────────

  private async getConfig(tenantId: string): Promise<LoyaltyConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const settings = tenant?.settings as Record<string, any>;
    const loyalty = settings?.loyalty;

    // default config ถ้าไม่ได้ตั้งค่า
    return {
      enabled: loyalty?.enabled ?? false,
      earnRate: loyalty?.earnRate ?? 1,
      earnPer: loyalty?.earnPer ?? 100,
      redeemRate: loyalty?.redeemRate ?? 1,
      minRedeemPoints: loyalty?.minRedeemPoints ?? 50,
      pointExpireMonths: loyalty?.pointExpireMonths ?? null,
    };
  }

  private async upsertAccount(tx: any, tenantId: string, phone: string) {
    // ดึง tier ต่ำสุด (Bronze / tier แรก)
    const lowestTier = await tx.loyaltyTierConfig.findFirst({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    // หา customer ก่อน
    const customer = await tx.customer.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      create: { tenantId, phone, visitCount: 0, totalSpend: 0 },
      update: {},
      select: { id: true },
    });

    return tx.loyaltyAccount.upsert({
      where: { customerId: customer.id },
      create: {
        tenantId,
        customerId: customer.id,
        phone,
        tierId: lowestTier?.id ?? null,
        points: 0,
        totalEarned: 0,
        totalSpend: 0,
        visitCount: 0,
      },
      update: {},
    });
  }

  private async getTierMultiplier(tx: any, tierId: string | null) {
    if (!tierId) return 1;
    const tier = await tx.loyaltyTierConfig.findUnique({
      where: { id: tierId },
      select: { multiplier: true },
    });
    return Number(tier?.multiplier ?? 1);
  }

  private async recalculateTier(
    tx: any,
    tenantId: string,
    totalEarned: number,
  ) {
    // หา tier สูงสุดที่ totalEarned ถึงเกณฑ์
    return tx.loyaltyTierConfig.findFirst({
      where: {
        tenantId,
        minPoints: { lte: totalEarned },
      },
      orderBy: { minPoints: "desc" }, // เอา tier สูงสุดที่ถึงเกณฑ์
    });
  }

  private async getNextTier(tenantId: string, totalEarned: number) {
    return this.prisma.loyaltyTierConfig.findFirst({
      where: {
        tenantId,
        minPoints: { gt: totalEarned },
      },
      orderBy: { minPoints: "asc" },
      select: {
        name: true,
        minPoints: true,
        color: true,
      },
    });
  }
}
