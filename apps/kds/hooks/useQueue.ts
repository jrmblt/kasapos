"use client";
import { useCallback, useEffect, useState } from "react";
import { getQueueSocket } from "@/lib/socket";

interface QueueTicket {
  id: string;
  ticketNo: number;
  displayCode: string;
  status: "WAITING" | "CALLED" | "DONE" | "SKIPPED";
  calledAt?: string;
}

interface QueueBoard {
  currentQueue: number;
  nowCalling: QueueTicket[];
  waiting: QueueTicket[];
  waitCount: number;
}

export function useQueue(branchId: string) {
  const [board, setBoard] = useState<QueueBoard>({
    currentQueue: 0,
    nowCalling: [],
    waiting: [],
    waitCount: 0,
  });
  const [connected, setConnected] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queue/${branchId}/board`,
      );
      const data = await res.json();
      setBoard(data);
    } catch (err) {
      console.error("Queue fetch error:", err);
    }
  }, [branchId]);

  useEffect(() => {
    fetchBoard();

    const socket = getQueueSocket(branchId);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("board:updated", (newBoard: QueueBoard) => {
      setBoard(newBoard);
      // เสียงเรียกคิว
      if (newBoard.nowCalling.length > 0) {
        new Audio("/sounds/queue-call.mp3").play().catch(() => { });
      }
    });

    socket.on("ticket:called", () => fetchBoard());
    socket.on("ticket:done", () => fetchBoard());

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("board:updated");
      socket.off("ticket:called");
      socket.off("ticket:done");
    };
  }, [branchId, fetchBoard]);

  return { board, connected };
}
