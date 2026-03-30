"use client";
import { use, useState } from "react";
import { type KdsOrder, type KdsOrderItem, useKds } from "@/hooks/useKds";
import AuthGuard from "@/components/AuthGuard";
import { getToken } from "@/hooks/useAuth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ── helpers ──────────────────────────────────────────────
function elapsed(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isUrgent(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() > 10 * 60 * 1000;
}

// ── Item row ─────────────────────────────────────────────
function ItemRow({
  item,
  orderId,
  token,
}: {
  item: KdsOrderItem;
  orderId: string;
  token: string;
}) {
  const [loading, setLoading] = useState(false);

  if (item.status === "VOIDED") return null;

  const nextStatus = item.status === "PENDING" ? "PREPARING" : "DONE";
  const isDone = item.status === "DONE";

  async function toggle() {
    if (isDone || loading) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/orders/${orderId}/items/${item.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
    } finally {
      setLoading(false);
    }
  }

  const modStr = Object.values(item.modifiers ?? {}).join(" · ");

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 6,
        cursor: isDone ? "default" : "pointer",
        background: isDone ? "#1a1a1a" : "transparent",
        opacity: isDone ? 0.4 : 1,
        marginBottom: 4,
        border: "1px solid transparent",
        transition: "background .15s",
        width: "100%",
        textAlign: "left",
      }}
    >
      {/* checkbox */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: isDone ? "none" : "1.5px solid #555",
          background: isDone ? "#2d5a2d" : "transparent",
          flexShrink: 0,
          marginTop: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isDone && (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M1.5 5L4 7.5L8.5 2.5"
              stroke="#4caf50"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isDone ? "#555" : "#ddd",
            textDecoration: isDone ? "line-through" : "none",
          }}
        >
          {item.qty}× {item.name}
        </div>
        {modStr && (
          <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>
            {modStr}
          </div>
        )}
        {item.note && (
          <div style={{ fontSize: 11, color: "#a06020", marginTop: 1 }}>
            ⚑ {item.note}
          </div>
        )}
      </div>

      {/* status badge */}
      {item.status === "PREPARING" && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#d4a830",
            background: "#2a2210",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          กำลังทำ
        </div>
      )}
    </button>
  );
}

// ── Order Card ───────────────────────────────────────────
function OrderCard({ order, token }: { order: KdsOrder; token: string }) {
  const urgent = isUrgent(order.createdAt);
  const allDone = order.items
    .filter((i) => i.status !== "VOIDED")
    .every((i) => i.status === "DONE");

  const borderColor = allDone ? "#243" : urgent ? "#533" : "#2a2a2a";

  const headBg = allDone ? "#0d1f0d" : urgent ? "#2a1a1a" : "#1f1f1f";

  const timerColor = allDone ? "#4caf50" : urgent ? "#ff4444" : "#e06060";

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* header */}
      <div
        style={{
          padding: "8px 12px",
          background: headBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
            {order.table ? `โต๊ะ ${order.table.name}` : "Takeaway"}
          </span>
          {urgent && !allDone && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#fff",
                background: "#e06060",
                padding: "1px 5px",
                borderRadius: 4,
                marginLeft: 6,
              }}
            >
              เร่งด่วน
            </span>
          )}
          <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
            {order.type === "DINE_IN" ? "Dine-in" : order.type}
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: timerColor }}>
          {elapsed(order.createdAt)}
        </span>
      </div>

      {/* items */}
      <div style={{ padding: "8px 10px", background: "#181818", flex: 1 }}>
        {order.note && (
          <div
            style={{
              fontSize: 11,
              color: "#a06020",
              background: "#2a1e0a",
              padding: "3px 8px",
              borderRadius: 4,
              marginBottom: 6,
            }}
          >
            หมายเหตุ: {order.note}
          </div>
        )}
        {order.items.map((item) => (
          <ItemRow key={item.id} item={item} orderId={order.id} token={token} />
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function KdsPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);
  const { orders } = useKds(branchId);
  const token = getToken() ?? "";

  const pending = orders.filter((o) => o.status === "PENDING");
  const preparing = orders.filter(
    (o) => o.status === "PREPARING" || o.status === "CONFIRMED",
  );
  const ready = orders.filter((o) => o.status === "READY");

  return (
    <AuthGuard>
    <div
      style={{
        background: "#111",
        minHeight: "100vh",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* topbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: "#1a1a1a",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>Kitchen Display</span>
        <div
          style={{ display: "flex", gap: 14, marginLeft: "auto", fontSize: 12 }}
        >
          <span style={{ color: "#e06060" }}>รอทำ {pending.length}</span>
          <span style={{ color: "#d4a830" }}>กำลังทำ {preparing.length}</span>
          <span style={{ color: "#4caf50" }}>เสร็จ {ready.length}</span>
        </div>
      </div>

      {/* board */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
          padding: 12,
          alignContent: "start",
          flex: 1,
        }}
      >
        {/* เรียง pending ก่อน → preparing → ready */}
        {[...pending, ...preparing, ...ready].map((order) => (
          <OrderCard key={order.id} order={order} token={token} />
        ))}
        {orders.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              color: "#444",
              fontSize: 18,
              paddingTop: 80,
            }}
          >
            ไม่มีออเดอร์
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  );
}
