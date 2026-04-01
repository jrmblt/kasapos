"use client";
import { useCallback, useEffect, useReducer } from "react";
import { getKdsSocket } from "../lib/socket";
import { clearToken } from "./useAuth";

export const KDS_EVENTS = {
  ORDER_NEW: "order:new",
  ORDER_ITEMS_ADDED: "order:items:added",
  ORDER_ITEM_UPDATED: "order:item:updated",
  ORDER_COMPLETED: "order:completed",
  ORDER_VOIDED: "order:item:voided",
} as const;

// ── Types ────────────────────────────────────────────────
export interface KdsOrderItem {
  id: string;
  name: string;
  qty: number;
  modifiers: Record<string, string>;
  note?: string;
  status: "PENDING" | "PREPARING" | "DONE" | "VOIDED";
}

export interface KdsOrder {
  id: string;
  branchId: string;
  type: string;
  status: string;
  note?: string;
  createdAt: string;
  table?: { name: string; zone?: string };
  items: KdsOrderItem[];
}

// ── Reducer ──────────────────────────────────────────────
type Action =
  | { type: "INIT"; payload: KdsOrder[] }
  | { type: "ADD"; payload: KdsOrder }
  | { type: "REPLACE"; payload: KdsOrder }
  | {
    type: "UPDATE_ITEM";
    payload: { orderId: string; itemId: string; status: string };
  }
  | { type: "REMOVE"; payload: { orderId: string } }
  | { type: "VOID_ITEM"; payload: { orderId: string; itemId: string } };

function reducer(state: KdsOrder[], action: Action): KdsOrder[] {
  switch (action.type) {
    case "INIT":
      return Array.isArray(action.payload) ? action.payload : state;

    case "ADD":
      if (state.some((o) => o.id === action.payload.id)) return state;
      return [...state, action.payload];

    case "REPLACE": {
      const exists = state.some((o) => o.id === action.payload.id);
      if (exists) {
        return state.map((o) =>
          o.id === action.payload.id ? action.payload : o,
        );
      }
      return [...state, action.payload];
    }

    case "UPDATE_ITEM":
      return state.map((order) => {
        if (order.id !== action.payload.orderId) return order;
        const items = order.items.map((item) =>
          item.id === action.payload.itemId
            ? { ...item, status: action.payload.status as KdsOrderItem["status"] }
            : item,
        );
        // recalc order status
        const allDone = items.every(
          (i) => i.status === "DONE" || i.status === "VOIDED",
        );
        const anyPreparing = items.some((i) => i.status === "PREPARING");
        return {
          ...order,
          items,
          status: allDone ? "READY" : anyPreparing ? "PREPARING" : order.status,
        };
      });

    case "REMOVE":
      return state.filter((o) => o.id !== action.payload.orderId);

    case "VOID_ITEM":
      return state.map((order) => {
        if (order.id !== action.payload.orderId) return order;
        return {
          ...order,
          items: order.items.map((item) =>
            item.id === action.payload.itemId
              ? { ...item, status: "VOIDED" as const }
              : item,
          ),
        };
      });

    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────
export function useKds(branchId: string) {
  const [orders, dispatch] = useReducer(reducer, []);

  // fetch initial data
  const fetchInitial = useCallback(async () => {
    try {
      const token = localStorage.getItem("kds_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/kds/${branchId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        console.error("KDS feed error:", res.status, res.statusText);
        if (res.status === 401) {
          clearToken();
          // router.push("/login");
        }
        return;
      }
      const data = await res.json();
      dispatch({ type: "INIT", payload: data });
    } catch (err) {
      console.error("KDS fetch error:", err);
    }
  }, [branchId]);

  useEffect(() => {
    fetchInitial();

    const socket = getKdsSocket(branchId);

    socket.on("order:new", (order: KdsOrder) => {
      dispatch({ type: "ADD", payload: order });
      new Audio("/sounds/new-order.mp3").play().catch(() => { });
    });

    socket.on("order:items:added", (order: KdsOrder) => {
      dispatch({ type: "REPLACE", payload: order });
      new Audio("/sounds/new-order.mp3").play().catch(() => { });
    });

    socket.on("order:item:updated", (payload) => {
      dispatch({ type: "UPDATE_ITEM", payload });
    });

    socket.on("order:completed", ({ orderId }) => {
      dispatch({ type: "REMOVE", payload: { orderId } });
    });

    socket.on("order:item:voided", ({ orderId, itemId }) => {
      dispatch({ type: "VOID_ITEM", payload: { orderId, itemId } });
    });

    return () => {
      socket.off("order:new");
      socket.off("order:items:added");
      socket.off("order:item:updated");
      socket.off("order:completed");
      socket.off("order:item:voided");
    };
  }, [branchId, fetchInitial]);

  return { orders };
}
