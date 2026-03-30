import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RedisService } from "../../redis/redis.service";

// KDS events ที่ client รับ
export const KDS_EVENTS = {
  ORDER_NEW: "order:new", // ออเดอร์ใหม่เข้า
  ORDER_ITEM_UPDATED: "order:item:updated", // item status เปลี่ยน
  ORDER_COMPLETED: "order:completed", // order จบแล้ว (ลบออกจาก board)
  ORDER_VOIDED: "order:item:voided", // item ถูก void
} as const;

@WebSocketGateway({
  namespace: "/kds",
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [
      "http://localhost:3001",
      "http://localhost:3200",
    ],
    credentials: true,
  },
})
export class KdsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(KdsGateway.name);

  constructor(private redis: RedisService) { }

  handleConnection(client: Socket) {
    const branchId = client.handshake.query.branchId as string;
    if (!branchId) {
      client.disconnect();
      return;
    }
    // แต่ละ branch เป็น room แยก
    client.join(`kds:${branchId}`);
    this.logger.log(`KDS connected: ${client.id} → branch ${branchId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`KDS disconnected: ${client.id}`);
  }

  // ── Emit helpers — เรียกจาก OrdersService ───────────

  emitNewOrder(branchId: string, order: unknown) {
    this.server.to(`kds:${branchId}`).emit(KDS_EVENTS.ORDER_NEW, order);
  }

  emitItemUpdated(
    branchId: string,
    payload: {
      orderId: string;
      itemId: string;
      status: string;
    },
  ) {
    this.server
      .to(`kds:${branchId}`)
      .emit(KDS_EVENTS.ORDER_ITEM_UPDATED, payload);
  }

  emitOrderCompleted(branchId: string, orderId: string) {
    this.server
      .to(`kds:${branchId}`)
      .emit(KDS_EVENTS.ORDER_COMPLETED, { orderId });
  }

  emitItemVoided(
    branchId: string,
    payload: {
      orderId: string;
      itemId: string;
      voidReason: string;
    },
  ) {
    this.server.to(`kds:${branchId}`).emit(KDS_EVENTS.ORDER_VOIDED, payload);
  }
}
