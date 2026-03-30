import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { QueueService } from "../queue/queue.service";
import { PayCashDto } from "./dto/pay-cash.dto";
import { PayPromptPayDto } from "./dto/pay-promptpay.dto";
import { RefundDto } from "./dto/refund.dto";
import { createOmiseClient } from "./omise.mock";

const REFRESH_TTL_SECONDS = 15 * 60; // QR หมดอายุใน 15 นาที

@Injectable()
export class PaymentsService {
  private omise = createOmiseClient();

  constructor(
    private prisma: PrismaService,
    private orders: OrdersService,
    private queue: QueueService,
  ) {}

  // ── PromptPay QR ─────────────────────────────────────
  async createPromptPay(dto: PayPromptPayDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { id: true, total: true, receiptNo: true, status: true },
    });
    if (!order) throw new NotFoundException("ไม่พบออเดอร์");
    if (order.status === "COMPLETED") {
      throw new BadRequestException("ออเดอร์นี้ชำระเงินแล้ว");
    }

    const charge = await this.omise.createCharge({
      amount: Math.round(Number(order.total) * 100),
      currency: "THB",
      source: { type: "promptpay" },
      description: `Order ${order.receiptNo ?? order.id}`,
      metadata: { orderId: order.id },
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        method: "PROMPTPAY",
        amount: order.total,
        status: "PENDING",
        gatewayRef: charge.id,
        gatewayData: charge as object,
      },
    });

    return {
      paymentId: payment.id,
      qrCodeUrl: charge.source?.scannable_code?.image?.download_uri,
      amount: order.total,
      expiresAt: charge.expires_at,
      // mock flag — frontend รู้ว่ากำลัง dev mode อยู่
      isMock: process.env.USE_REAL_OMISE !== "true",
    };
  }

  // ── Mock confirm (dev only) ───────────────────────────
  // simulate webhook ที่ Omise จะส่งมาตอน production
  async mockConfirmPromptPay(paymentId: string) {
    if (process.env.USE_REAL_OMISE === "true") {
      throw new BadRequestException("ไม่สามารถใช้ mock confirm ใน production");
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, orderId: true, gatewayRef: true, status: true },
    });
    if (!payment) throw new NotFoundException("ไม่พบ payment");
    if (payment.status === "CONFIRMED") {
      throw new BadRequestException("ชำระเงินแล้ว");
    }

    // เรียก logic เดียวกับที่ webhook จะเรียก
    await this.handleChargeComplete({
      id: payment.gatewayRef!,
      status: "successful",
      metadata: { orderId: payment.orderId },
      source: { phone_number: "0812345678" }, // mock phone
    });

    return { success: true, message: "Mock payment confirmed" };
  }

  // ── Cash ─────────────────────────────────────────────
  async payCash(dto: PayCashDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { id: true, total: true, status: true },
    });
    if (!order) throw new NotFoundException("ไม่พบออเดอร์");
    if (order.status === "COMPLETED") {
      throw new BadRequestException("ออเดอร์นี้ชำระเงินแล้ว");
    }

    const total = Number(order.total);
    const changeAmt = dto.cashReceived - total;

    if (changeAmt < 0) {
      throw new BadRequestException(
        `รับเงินไม่พอ ต้องการ ${total} บาท (ขาดอีก ${Math.abs(changeAmt)} บาท)`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          orderId: dto.orderId,
          method: "CASH",
          amount: order.total,
          cashReceived: dto.cashReceived,
          changeAmt,
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      }),
      this.prisma.order.update({
        where: { id: dto.orderId },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
    ]);

    // ปิด session + คืนโต๊ะ
    // await this.orders.complete(dto.orderId, "");
    await this.orders.completeInternal(dto.orderId);

    try {
      await this.queue.createTicket(dto.branchId, { orderId: dto.orderId });
    } catch {
      // queue disabled → ไม่เป็นไร
    }
    // try {
    //   const order = await this.prisma.order.findUnique({
    //     where: { id: dto.orderId },
    //     select: { branchId: true },
    //   })
    //   if (order) {
    //     await this.queue.createTicket(order.branchId, { orderId: dto.orderId });
    //   }
    // } catch {
    //   // queue disabled → ไม่เป็นไร ไม่ต้อง throw
    // }

    return { success: true, changeAmt };
  }

  // ── Refund ───────────────────────────────────────────
  async refund(dto: RefundDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      select: {
        id: true,
        method: true,
        amount: true,
        status: true,
        gatewayRef: true,
      },
    });
    if (!payment) throw new NotFoundException("ไม่พบ payment");
    if (payment.status !== "CONFIRMED") {
      throw new BadRequestException("refund ได้เฉพาะ payment ที่ confirmed แล้ว");
    }

    const refundAmt = dto.amount ?? Number(payment.amount);

    // เรียก gateway refund ถ้าไม่ใช่ cash
    let refundRef: string | undefined;
    if (payment.method !== "CASH" && payment.gatewayRef) {
      const refund = await this.omise.createRefund(payment.gatewayRef, {
        amount: Math.round(refundAmt * 100),
        reason: dto.reason,
      });
      refundRef = refund.id;
    }

    return this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        status: dto.amount ? "PARTIAL_REFUND" : "REFUNDED",
        refundAmt,
        refundRef,
        refundedAt: new Date(),
      },
    });
  }

  // ── Webhook handler (ใช้ทั้ง webhook จริง + mock confirm) ─
  async handleChargeComplete(charge: {
    id: string;
    status: string;
    metadata: Record<string, string>;
    source?: { phone_number?: string };
  }) {
    if (charge.status !== "successful") return;

    const orderId = charge.metadata?.orderId;
    if (!orderId) return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        total: true,
        branch: { select: { tenantId: true } },
        status: true,
      },
    });
    if (!order || order.status === "COMPLETED") return;

    await this.prisma.$transaction(async (tx) => {
      // อัป payment
      await tx.payment.updateMany({
        where: { gatewayRef: charge.id, status: "PENDING" },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });

      // อัป order
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          customerPhone: charge.source?.phone_number ?? undefined,
        },
      });

      // CRM lite — upsert customer จากเบอร์ PromptPay
      const phone = charge.source?.phone_number;
      if (phone && order.branch.tenantId) {
        await tx.customer.upsert({
          where: { tenantId_phone: { tenantId: order.branch.tenantId, phone } },
          create: {
            tenantId: order.branch.tenantId,
            phone,
            visitCount: 1,
            totalSpend: order.total,
            lastVisitAt: new Date(),
          },
          update: {
            visitCount: { increment: 1 },
            totalSpend: { increment: Number(order.total) },
            lastVisitAt: new Date(),
          },
        });
      }
    });

    // ปิด session + คืนโต๊ะ
    // await this.orders.complete(orderId); // tenantId จะถูกดึงจาก order.branch.tenantId
    await this.orders.completeInternal(orderId);

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { branchId: true },
      });
      if (order) {
        await this.queue.createTicket(order.branchId, { orderId });
      }
    } catch {
      // queue disabled → ไม่เป็นไร ไม่ต้อง throw
    }
  }

  // ── Get payment status ────────────────────────────────
  async getStatus(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        method: true,
        amount: true,
        confirmedAt: true,
        changeAmt: true,
      },
    });
    if (!payment) throw new NotFoundException("ไม่พบ payment");
    return payment;
  }
}
