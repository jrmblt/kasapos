import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

export const QUEUE_EVENTS = {
  TICKET_CREATED: "ticket:created", // ตั๋วใหม่
  TICKET_CALLED: "ticket:called", // เรียกคิว
  TICKET_DONE: "ticket:done", // คิวเสร็จ
  BOARD_UPDATED: "board:updated", // board refresh
} as const;

@WebSocketGateway({
  namespace: "/queue",
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [
      "http://localhost:3100",
      "http://localhost:3001",
      "http://localhost:3200",
      "http://localhost:3300",
      "http://localhost:3400",
    ],
    credentials: true,
  },
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(QueueGateway.name);

  handleConnection(client: Socket) {
    const branchId = client.handshake.query.branchId as string;
    if (!branchId) {
      client.disconnect();
      return;
    }
    client.join(`queue:${branchId}`);
    this.logger.log(
      `Queue display connected: ${client.id} → branch ${branchId}`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Queue display disconnected: ${client.id}`);
  }

  emitTicketCreated(branchId: string, ticket: unknown) {
    this.server
      .to(`queue:${branchId}`)
      .emit(QUEUE_EVENTS.TICKET_CREATED, ticket);
  }

  emitTicketCalled(branchId: string, ticket: unknown) {
    this.server
      .to(`queue:${branchId}`)
      .emit(QUEUE_EVENTS.TICKET_CALLED, ticket);
  }

  emitTicketDone(branchId: string, ticketId: string) {
    this.server
      .to(`queue:${branchId}`)
      .emit(QUEUE_EVENTS.TICKET_DONE, { ticketId });
  }

  emitBoardUpdated(branchId: string, board: unknown) {
    this.server.to(`queue:${branchId}`).emit(QUEUE_EVENTS.BOARD_UPDATED, board);
  }
}
