import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ApplyCouponDto } from "./dto/apply-coupon.dto";
import { CreateCouponDto } from "./dto/create-coupon.dto";

// config shape จาก tenant.settings.coupon
interface CouponConfig {
  enabled: boolean;
  maxPerOrder: number;
  stackWithPoints: boolean;
  stackBetweenCoupons: boolean;
}

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) { }

  // ── CRUD ─────────────────────────────────────────────

  async create(tenantId: string, dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });
    if (existing) throw new ConflictException(`code "${dto.code}" มีอยู่แล้ว`);

    return this.prisma.coupon.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        tenantId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      include: { tier: { select: { name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async toggle(tenantId: string, couponId: string, isActive: boolean) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id: couponId, tenantId },
    });
    if (!coupon) throw new NotFoundException("ไม่พบคูปอง");

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: { isActive },
    });
  }

  // ── Validate (ไม่ apply ยัง — แค่เช็คว่าใช้ได้ไหม) ───
  async validate(
    tenantId: string,
    code: string,
    orderId: string,
    accountId: string | null,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branch: { tenantId } },
      select: { id: true, subtotal: true, memberAccountId: true },
    });
    if (!order) throw new NotFoundException("ไม่พบออเดอร์");

    const coupon = await this.getCouponOrThrow(tenantId, code);
    await this.assertCouponEligible(coupon, order, accountId, tenantId);

    const discountAmt = this.calcDiscount(coupon, Number(order.subtotal));

    return {
      couponId: coupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      discountAmt,
      description: this.buildDescription(coupon, discountAmt),
    };
  }

  // ── Apply — บันทึกการใช้งานจริง ───────────────────────
  async apply(tenantId: string, dto: ApplyCouponDto) {
    const config = await this.getConfig(tenantId);
    if (!config.enabled) {
      throw new BadRequestException("ระบบคูปองปิดอยู่");
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, branch: { tenantId } },
      select: {
        id: true,
        subtotal: true,
        discountAmt: true,
        total: true,
        memberAccountId: true,
        couponUsages: { select: { couponId: true } },
      },
    });
    if (!order) throw new NotFoundException("ไม่พบออเดอร์");

    // เช็ค max coupon per order
    if (order.couponUsages.length >= config.maxPerOrder) {
      throw new BadRequestException(
        `ใช้ได้สูงสุด ${config.maxPerOrder} คูปองต่อออเดอร์`,
      );
    }

    const coupon = await this.getCouponOrThrow(tenantId, dto.code);

    // ตรวจ coupon ซ้ำ
    const alreadyUsed = order.couponUsages.some(
      (u) => u.couponId === coupon.id,
    );
    if (alreadyUsed) {
      throw new BadRequestException("ใช้คูปองนี้ในออเดอร์นี้แล้ว");
    }

    await this.assertCouponEligible(
      coupon,
      order,
      dto.accountId ?? null,
      tenantId,
    );

    const discountAmt = this.calcDiscount(coupon, Number(order.subtotal));
    const newDiscount = Number(order.discountAmt) + discountAmt;
    const newTotal = Math.max(0, Number(order.total) - discountAmt);

    await this.prisma.$transaction([
      // บันทึก usage
      this.prisma.couponUsage.create({
        data: {
          couponId: coupon.id,
          orderId: dto.orderId,
          accountId: dto.accountId ?? null,
          discount: discountAmt,
        },
      }),
      // อัป discount บน order
      this.prisma.order.update({
        where: { id: dto.orderId },
        data: {
          discountAmt: newDiscount,
          discountNote: coupon.name,
          total: newTotal,
        },
      }),
      // increment usedCount
      this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountAmt,
      newTotal,
    };
  }

  // ── Remove coupon จาก order ───────────────────────────
  async remove(tenantId: string, orderId: string, couponId: string) {
    const usage = await this.prisma.couponUsage.findFirst({
      where: {
        couponId,
        orderId,
        order: { branch: { tenantId } },
      },
      select: { id: true, discount: true },
    });
    if (!usage) throw new NotFoundException("ไม่พบการใช้คูปองนี้");

    await this.prisma.$transaction([
      this.prisma.couponUsage.delete({ where: { id: usage.id } }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          discountAmt: { decrement: Number(usage.discount) },
          total: { increment: Number(usage.discount) },
        },
      }),
      this.prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  }

  // ── Private helpers ───────────────────────────────────

  private async getCouponOrThrow(tenantId: string, code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
    });
    if (!coupon) throw new NotFoundException("ไม่พบคูปองนี้");
    if (!coupon.isActive) throw new BadRequestException("คูปองนี้ถูกปิดใช้งาน");

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException("คูปองยังไม่เริ่มใช้งาน");
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException("คูปองหมดอายุแล้ว");
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException("คูปองถูกใช้ครบแล้ว");
    }

    return coupon;
  }

  private async assertCouponEligible(
    coupon: any,
    order: { id: string; subtotal: any; memberAccountId?: string | null },
    accountId: string | null,
    tenantId: string,
  ) {
    // เช็คขั้นต่ำ
    if (
      coupon.minOrderAmt !== null &&
      Number(order.subtotal) < Number(coupon.minOrderAmt)
    ) {
      throw new BadRequestException(`ต้องสั่งขั้นต่ำ ฿${coupon.minOrderAmt}`);
    }

    // PUBLIC — ใครก็ใช้ได้
    if (coupon.targetType === "PUBLIC") return;

    // ทุก type ที่เหลือต้องเป็น member
    if (!accountId) {
      throw new BadRequestException("คูปองนี้สำหรับสมาชิกเท่านั้น");
    }

    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { id: accountId, tenantId },
      select: {
        id: true,
        tierId: true,
        visitCount: true,
        couponUsages: {
          where: { couponId: coupon.id },
          select: { id: true },
        },
      },
    });
    if (!account) throw new NotFoundException("ไม่พบบัญชีสมาชิก");

    // เช็ค usagePerMember
    if (
      coupon.usagePerMember !== null &&
      account.couponUsages.length >= coupon.usagePerMember
    ) {
      throw new BadRequestException(
        `ใช้คูปองนี้ได้สูงสุด ${coupon.usagePerMember} ครั้ง`,
      );
    }

    if (coupon.targetType === "MEMBER_TIER") {
      if (account.tierId !== coupon.tierId) {
        throw new BadRequestException("ระดับสมาชิกไม่ตรงกับเงื่อนไขคูปอง");
      }
    }

    if (coupon.targetType === "MEMBER_NEW") {
      if (account.visitCount > 1) {
        throw new BadRequestException("คูปองนี้สำหรับสมาชิกใหม่เท่านั้น");
      }
    }

    if (coupon.targetType === "MEMBER_FIRST_ORDER") {
      // เช็คว่ามี completed order ก่อนหน้านี้ไหม
      const prevOrders = await this.prisma.order.count({
        where: {
          memberAccountId: accountId,
          status: "COMPLETED",
          id: { not: order.id },
        },
      });
      if (prevOrders > 0) {
        throw new BadRequestException("คูปองนี้สำหรับ order แรกเท่านั้น");
      }
    }
  }

  private calcDiscount(coupon: any, subtotal: number): number {
    if (coupon.type === "FIXED_DISCOUNT") {
      return Math.min(Number(coupon.value), subtotal);
    }

    // PERCENT_DISCOUNT
    const raw = subtotal * (Number(coupon.value) / 100);
    const capped = coupon.maxDiscountAmt
      ? Math.min(raw, Number(coupon.maxDiscountAmt))
      : raw;

    return Math.round(capped * 100) / 100; // round 2 decimal
  }

  private buildDescription(coupon: any, discountAmt: number): string {
    if (coupon.type === "FIXED_DISCOUNT") return `ลด ฿${coupon.value}`;
    return `ลด ${coupon.value}% (฿${discountAmt})`;
  }

  private async getConfig(tenantId: string): Promise<CouponConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    // TODO: type
    const s = (tenant?.settings as any)?.coupon;
    return {
      enabled: s?.enabled ?? true,
      maxPerOrder: s?.maxPerOrder ?? 1,
      stackWithPoints: s?.stackWithPoints ?? false,
      stackBetweenCoupons: s?.stackBetweenCoupons ?? false,
    };
  }
}
