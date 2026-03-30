import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";

@Injectable()
export class QueueService {
  constructor(private prisma: PrismaService) {}

  // ── สร้างตั๋วคิว (เรียกหลัง payment confirm) ───────────
  async createTicket(branchId: string, dto: CreateTicketDto) {
    // เช็คว่า order นี้มีตั๋วแล้วหรือยัง
    const existing = await this.prisma.queueTicket.findUnique({
      where: { orderId: dto.orderId },
    });
    if (existing) {
      throw new ConflictException("ออเดอร์นี้มีตั๋วคิวแล้ว");
    }

    // เช็ค branch เปิด queue ไหม
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { queueEnabled: true, currentQueue: true },
    });
    if (!branch) throw new NotFoundException("ไม่พบสาขา");
    if (!branch.queueEnabled) {
      throw new BadRequestException("สาขานี้ไม่ได้เปิดใช้ระบบคิว");
    }

    // increment currentQueue แบบ atomic
    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: { currentQueue: { increment: 1 } },
      select: { currentQueue: true },
    });

    const ticketNo = updated.currentQueue;
    const displayCode = `A${String(ticketNo).padStart(3, "0")}`; // A001, A042

    return this.prisma.queueTicket.create({
      data: {
        branchId,
        orderId: dto.orderId,
        ticketNo,
        displayCode,
        status: "WAITING",
      },
    });
  }

  // ── ดึงคิวทั้งหมดของสาขา (สำหรับหน้าจอ TV) ────────────
  async getQueueBoard(branchId: string) {
    const [tickets, branch] = await Promise.all([
      this.prisma.queueTicket.findMany({
        where: {
          branchId,
          status: { in: ["WAITING", "CALLED"] },
        },
        orderBy: { ticketNo: "asc" },
        select: {
          id: true,
          ticketNo: true,
          displayCode: true,
          status: true,
          createdAt: true,
          calledAt: true,
        },
      }),
      this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { currentQueue: true },
      }),
    ]);

    const waiting = tickets.filter((t) => t.status === "WAITING");
    const called = tickets.filter((t) => t.status === "CALLED");

    return {
      currentQueue: branch?.currentQueue ?? 0,
      nowCalling: called, // กำลังเรียก (แสดงใหญ่บนจอ)
      waiting: waiting, // รอคิวอยู่
      waitCount: waiting.length,
    };
  }

  // ── ดึงสถานะตั๋วตัวเอง (ลูกค้าสแกน QR receipt) ─────────
  async getTicketByOrder(orderId: string) {
    const ticket = await this.prisma.queueTicket.findUnique({
      where: { orderId },
      select: {
        ticketNo: true,
        displayCode: true,
        status: true,
        calledAt: true,
        createdAt: true,
        branch: {
          select: {
            currentQueue: true,
            queueEnabled: true,
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException("ไม่พบตั๋วคิว");

    // คำนวณคนที่รออยู่ข้างหน้า
    const aheadCount =
      ticket.status === "WAITING"
        ? await this.prisma.queueTicket.count({
            where: {
              branch: { orders: { some: { id: orderId } } },
              ticketNo: { lt: ticket.ticketNo },
              status: "WAITING",
            },
          })
        : 0;

    return {
      ...ticket,
      aheadCount,
      estimatedMinutes: aheadCount * 3, // rough estimate 3 นาทีต่อคิว
    };
  }

  // ── เรียกคิว (staff กด) ──────────────────────────────
  async updateTicket(ticketId: string, branchId: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.queueTicket.findFirst({
      where: { id: ticketId, branchId },
    });
    if (!ticket) throw new NotFoundException("ไม่พบตั๋วคิว");

    // validate state transition
    this.assertValidTransition(ticket.status, dto.status);

    return this.prisma.queueTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
        calledAt: dto.status === "CALLED" ? new Date() : undefined,
        completedAt: ["DONE", "SKIPPED"].includes(dto.status)
          ? new Date()
          : undefined,
      },
    });
  }

  // ── เรียกคิวถัดไป (กดปุ่ม "เรียกคิวถัดไป") ─────────────
  async callNext(branchId: string) {
    // หา WAITING คิวแรกสุด
    const next = await this.prisma.queueTicket.findFirst({
      where: { branchId, status: "WAITING" },
      orderBy: { ticketNo: "asc" },
    });
    if (!next) throw new BadRequestException("ไม่มีคิวที่รออยู่");

    // CALLED เดิม → DONE ก่อน
    await this.prisma.queueTicket.updateMany({
      where: { branchId, status: "CALLED" },
      data: { status: "DONE", completedAt: new Date() },
    });

    // เรียกคิวใหม่
    return this.prisma.queueTicket.update({
      where: { id: next.id },
      data: { status: "CALLED", calledAt: new Date() },
    });
  }

  // ── Reset คิว (เปิดวันใหม่) ───────────────────────────
  async resetQueue(branchId: string, tenantId: string) {
    // เช็ค branch ownership
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) throw new NotFoundException("ไม่พบสาขา");

    await this.prisma.$transaction([
      // reset counter
      this.prisma.branch.update({
        where: { id: branchId },
        data: { currentQueue: 0 },
      }),
      // mark ที่ค้างอยู่ทั้งหมดว่า SKIPPED
      this.prisma.queueTicket.updateMany({
        where: { branchId, status: { in: ["WAITING", "CALLED"] } },
        data: { status: "SKIPPED", completedAt: new Date() },
      }),
    ]);

    return { success: true, message: "Reset คิวเรียบร้อย" };
  }

  // ── Toggle queue on/off ───────────────────────────────
  async toggleQueue(branchId: string, tenantId: string, enabled: boolean) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) throw new NotFoundException("ไม่พบสาขา");

    return this.prisma.branch.update({
      where: { id: branchId },
      data: { queueEnabled: enabled },
      select: { id: true, queueEnabled: true },
    });
  }

  // ── Private: state machine ────────────────────────────
  private assertValidTransition(
    current: "WAITING" | "CALLED" | "DONE" | "SKIPPED",
    next: "CALLED" | "DONE" | "SKIPPED",
  ) {
    const allowed: Record<string, string[]> = {
      WAITING: ["CALLED", "SKIPPED"],
      CALLED: ["DONE", "SKIPPED"],
      DONE: [],
      SKIPPED: [],
    };

    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(
        `ไม่สามารถเปลี่ยนสถานะจาก ${current} → ${next}`,
      );
    }
  }
}
