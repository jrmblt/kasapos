import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3200";

let kdsSocket: Socket | null = null;
let queueSocket: Socket | null = null;

export function getKdsSocket(branchId: string): Socket {
  if (!kdsSocket || !kdsSocket.connected) {
    kdsSocket = io(`${API_URL}/kds`, {
      query: { branchId },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return kdsSocket;
}

export function getQueueSocket(branchId: string): Socket {
  if (!queueSocket || !queueSocket.connected) {
    queueSocket = io(`${API_URL}/queue`, {
      query: { branchId },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return queueSocket;
}

export function disconnectAll() {
  kdsSocket?.disconnect();
  queueSocket?.disconnect();
  kdsSocket = null;
  queueSocket = null;
}
