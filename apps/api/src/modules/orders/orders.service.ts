import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderItemStatus, OrderStatus } from "@repo/database";
import * as crypto from "crypto";
import { KdsGateway } from "src/gateways/kds/kds.gateway";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { VoidItemDto } from "./dto/void-item.dto";

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private kds: KdsGateway,
  ) { }

  // ── Create Order ─────────────────────────────────────
  async create(cashierId: string, tenantId: string, dto: CreateOrderDto) {
    // 1. ดึงราคาจาก DB — ไม่ใช้ราคาจาก client เด็ดขาด
    const menuIds = [...new Set(dto.items.map((i) => i.menuItemId))];
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuIds }, tenantId },
      select: {
        id: true,
        name: true,
        price: true,
        stockQty: true,
        isAvailable: true,
      },
    });

    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    // 2. validate ทุก item
    for (const item of dto.items) {
      const menu = menuMap.get(item.menuItemId);
      if (!menu) {
        throw new NotFoundException(`ไม่พบเมนู ${item.menuItemId}`);
      }
      if (!menu.isAvailable) {
        throw new BadRequestException(`${menu.name} ไม่พร้อมขาย`);
      }
      if (menu.stockQty !== null && menu.stockQty < item.qty) {
        throw new BadRequestException(
          `${menu.name} stock ไม่พอ (เหลือ ${menu.stockQty})`,
        );
      }
    }

    // 3. คำนวณยอด
    const orderItems = dto.items.map((item) => {
      const menu = menuMap.get(item.menuItemId)!;
      return {
        menuItemId: item.menuItemId,
        name: menu.name,
        unitPrice: menu.price,
        qty: item.qty,
        modifiers: item.modifiers ?? {},
        note: item.note,
      };
    });

    const subtotal = orderItems.reduce(
      (s, i) => s + Number(i.unitPrice) * i.qty,
      0,
    );

    // 4. สร้าง order + ตัด stock ใน transaction เดียว
    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          branchId: dto.branchId,
          tableId: dto.tableId,
          sessionId: dto.sessionId,
          cashierId,
          type: dto.type ?? "DINE_IN",
          note: dto.note,
          subtotal,
          total: subtotal,
          receiptToken: crypto.randomUUID(),
          items: { create: orderItems },
        },
        include: {
          items: true,
          table: { select: { name: true } },
        },
      });

      // ตัด stock
      for (const item of dto.items) {
        const menu = menuMap.get(item.menuItemId)!;
        if (menu.stockQty === null) continue;

        const newQty = menu.stockQty - item.qty;
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stockQty: newQty, isAvailable: newQty > 0 },
        });
        await tx.stockLog.create({
          data: {
            menuItemId: item.menuItemId,
            delta: -item.qty,
            qtyAfter: newQty,
            reason: "ORDER_DEDUCT",
            orderId: order.id,
          },
        });
      }

      // อัปเดต table status → OCCUPIED
      if (dto.tableId) {
        await tx.table.update({
          where: { id: dto.tableId },
          data: { status: "OCCUPIED" },
        });
      }

      return order;
    });
    this.kds.emitNewOrder(dto.branchId, order)
    return order
  }

  // ── Get Order ────────────────────────────────────────
  async findOne(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        branch: { tenantId },
      },
      include: {
        items: { where: { status: { not: "VOIDED" } } },
        table: { select: { name: true, zone: true } },
        payments: { select: { method: true, amount: true, status: true } },
      },
    });
    if (!order) throw new NotFoundException("ไม่พบออเดอร์");
    return order;
  }

  // ── KDS Feed ─────────────────────────────────────────
  async getKdsFeed(branchId: string) {
    return this.prisma.order.findMany({
      where: {
        branchId,
        status: { in: ["PENDING", "CONFIRMED", "PREPARING"] },
      },
      include: {
        items: {
          where: { status: { not: "VOIDED" } },
          orderBy: { createdAt: "asc" },
        },
        table: { select: { name: true, zone: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  // ── Update Item Status (KDS กด) ──────────────────────
  async updateItemStatus(
    orderId: string,
    itemId: string,
    status: (typeof OrderItemStatus)[keyof typeof OrderItemStatus],
  ) {
    const item = await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.update({
        where: { id: itemId },
        data: { status },
        select: {
          orderId: true,
          order: {
            select: {
              status: true,
              items: { select: { status: true } },
            },
          },
        },
      });

      // ถ้าทุก item DONE → order → READY
      const allDone = item.order.items.every((i) => i.status === "DONE");
      if (allDone && item.order.status !== "READY") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "READY" },
        });
      }

      // ถ้ามี item PREPARING อยู่ → order → PREPARING
      const anyPreparing = item.order.items.some(
        (i) => i.status === "PREPARING",
      );
      if (anyPreparing && item.order.status === "PENDING") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CONFIRMED" },
        });
      }

      return item;
    });
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { branchId: true },
    })
    if (order) {
      this.kds.emitItemUpdated(order.branchId, { orderId, itemId, status })
    }
    return item
  }

  // ── Void Item ────────────────────────────────────────
  async voidItem(
    userId: string,
    tenantId: string,
    orderId: string,
    itemId: string,
    dto: VoidItemDto,
  ) {
    // ตรวจ PIN ของ user ที่ขอ void
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pinCode: true, role: true },
    });

    if (!user?.pinCode || user.pinCode !== dto.pin) {
      throw new ForbiddenException("PIN ไม่ถูกต้อง");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.update({
        where: { id: itemId },
        data: {
          status: "VOIDED",
          voidedById: userId,
          voidReason: dto.voidReason,
        },
        select: {
          menuItemId: true,
          qty: true,
          orderId: true,
          unitPrice: true,
        },
      });

      // คืน stock (ถ้า track)
      const menu = await tx.menuItem.findUnique({
        where: { id: item.menuItemId },
        select: { stockQty: true },
      });

      if (menu?.stockQty !== null && menu?.stockQty !== undefined) {
        const newQty = menu.stockQty + item.qty;
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stockQty: newQty, isAvailable: newQty > 0 },
        });
        await tx.stockLog.create({
          data: {
            menuItemId: item.menuItemId,
            delta: item.qty,
            qtyAfter: newQty,
            reason: "VOID_RESTORE",
            orderId: item.orderId,
          },
        });
      }

      // recalculate total
      const remaining = await tx.orderItem.findMany({
        where: { orderId: item.orderId, status: { not: "VOIDED" } },
        select: { unitPrice: true, qty: true },
      });
      const newTotal = remaining.reduce(
        (s, i) => s + Number(i.unitPrice) * i.qty,
        0,
      );
      await tx.order.update({
        where: { id: item.orderId },
        data: { subtotal: newTotal, total: newTotal },
      });

      return { success: true };
    });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { branchId: true },
    })
    if (order) {
      this.kds.emitItemVoided(order.branchId, {
        orderId,
        itemId,
        voidReason: dto.voidReason,
      })
    }

    return result
  }

  // ── Complete Order (หลังชำระเงิน) ────────────────────
  // async complete(orderId: string, tenantId: string) {
  //   const order = await this.findOne(tenantId, orderId);
  //   if (!order) throw new NotFoundException("ไม่พบออเดอร์");
  //   if (order.status === "COMPLETED") throw new BadRequestException("ออเดอร์นี้ชำระเงินแล้ว");
  //   return this.prisma.$transaction(async (tx) => {
  //     const order = await tx.order.update({
  //       where: { id: orderId },
  //       data: { status: "COMPLETED", completedAt: new Date() },
  //       select: { tableId: true, sessionId: true, total: true },
  //     });

  //     // คืนโต๊ะ → AVAILABLE
  //     if (order.tableId) {
  //       // เช็คก่อนว่ายังมี order อื่น active อยู่ไหม
  //       const activeOrders = await tx.order.count({
  //         where: {
  //           tableId: order.tableId,
  //           status: {
  //             in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"],
  //           },
  //           id: { not: orderId },
  //         },
  //       });
  //       if (activeOrders === 0) {
  //         await tx.table.update({
  //           where: { id: order.tableId },
  //           data: { status: "AVAILABLE" },
  //         });
  //       }
  //     }

  //     // ปิด session (ถ้ามี)
  //     if (order.sessionId) {
  //       await tx.tableSession.update({
  //         where: { id: order.sessionId },
  //         data: { status: "CLOSED", closedAt: new Date() },
  //       });
  //     }

  //     return order;
  //   });
  // }
  // เรียกจาก controller — ต้องเช็ค tenant ก่อน
  async complete(orderId: string, tenantId: string) {
    // เช็ค ownership ก่อนทำอะไรทั้งนั้น
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        branch: { tenantId }, // cross-tenant ไม่ผ่าน → null → 404
        status: {
          in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"],
        },
      },
      select: { id: true },
    });
    if (!order) throw new NotFoundException("ไม่พบออเดอร์หรือไม่มีสิทธิ์");

    return this._completeInternal(orderId);
  }

  // เรียกจาก PaymentsService (webhook) — เช็คแล้วก่อนเรียก
  async completeInternal(orderId: string) {
    return this._completeInternal(orderId);
  }

  // private — logic จริง ไม่มี security check
  private async _completeInternal(orderId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED", completedAt: new Date() },
        select: { tableId: true, sessionId: true },
      });

      if (order.tableId) {
        const activeCount = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: { not: orderId },
            status: {
              in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"],
            },
          },
        });
        if (activeCount === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: "AVAILABLE" },
          });
        }
      }

      if (order.sessionId) {
        await tx.tableSession.update({
          where: { id: order.sessionId },
          data: { status: "CLOSED", closedAt: new Date() },
        });
      }

      return order;
    });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { branchId: true },
    })
    if (order) {
      this.kds.emitOrderCompleted(order.branchId, orderId)
    }
    return result
  }

  // ── Get by Receipt Token (QR receipt) ────────────────
  async findByReceiptToken(token: string) {
    const order = await this.prisma.order.findUnique({
      where: { receiptToken: token },
      include: {
        items: {
          where: { status: { not: "VOIDED" } },
          select: { name: true, qty: true, unitPrice: true, modifiers: true },
        },
        table: { select: { name: true } },
        payments: { select: { method: true, amount: true, status: true } },
        queueTicket: {
          select: { ticketNo: true, displayCode: true, status: true },
        },
      },
    });
    if (!order) throw new NotFoundException("ไม่พบออเดอร์");
    return order;
  }
}
