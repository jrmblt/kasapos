import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { Permission } from "@repo/database";
import {
  CurrentUser,
  type JwtPayload,
} from "../../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ToggleQueueDto } from "./dto/toggle-queue.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import { QueueService } from "./queue.service";

@Controller("queue")
export class QueueController {
  constructor(private queue: QueueService) {}

  // ── สร้างตั๋วคิว ───────────────────────────────────────
  @Post(":branchId/tickets")
  @RequirePermissions(Permission.QUEUE_MANAGE)
  createTicket(
    @Param("branchId") branchId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.queue.createTicket(branchId, dto);
  }

  // ── หน้าจอ TV — public ─────────────────────────────────
  // ลูกค้ามองหน้าจอ ไม่ต้อง login
  @Public()
  @Get(":branchId/board")
  getBoard(@Param("branchId") branchId: string) {
    return this.queue.getQueueBoard(branchId);
  }

  // ── ลูกค้าเช็คคิวตัวเอง (สแกน QR receipt) ─────────────
  // public — ลูกค้าไม่มี token
  @Public()
  @Get("by-order/:orderId")
  getByOrder(@Param("orderId") orderId: string) {
    return this.queue.getTicketByOrder(orderId);
  }

  // ── Staff: เรียกคิวถัดไป ───────────────────────────────
  @Post(":branchId/call-next")
  @RequirePermissions(Permission.QUEUE_MANAGE)
  @HttpCode(HttpStatus.OK)
  callNext(@Param("branchId") branchId: string) {
    return this.queue.callNext(branchId);
  }

  // ── Staff: อัปเดตสถานะตั๋ว ────────────────────────────
  @Patch(":branchId/tickets/:ticketId")
  @RequirePermissions(Permission.QUEUE_MANAGE)
  updateTicket(
    @Param("branchId") branchId: string,
    @Param("ticketId") ticketId: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.queue.updateTicket(ticketId, branchId, dto);
  }

  // ── Manager: reset คิว ────────────────────────────────
  @Post(":branchId/reset")
  @RequirePermissions(Permission.QUEUE_MANAGE)
  @HttpCode(HttpStatus.OK)
  resetQueue(
    @CurrentUser() user: JwtPayload,
    @Param("branchId") branchId: string,
  ) {
    return this.queue.resetQueue(branchId, user.tenantId);
  }

  // ── Manager: เปิด/ปิด queue ───────────────────────────
  @Patch(":branchId/toggle")
  @RequirePermissions(Permission.QUEUE_MANAGE)
  toggleQueue(
    @CurrentUser() user: JwtPayload,
    @Param("branchId") branchId: string,
    @Body() dto: ToggleQueueDto,
  ) {
    return this.queue.toggleQueue(branchId, user.tenantId, dto.enabled);
  }
}
