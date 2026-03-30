"use client";
import { use } from "react";
import { useQueue } from "@/hooks/useQueue";
import AuthGuard from "@/components/AuthGuard";

export default function QueuePage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);
  const { board, connected } = useQueue(branchId);

  return (
    <AuthGuard>
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* header */}
      <div
        style={{
          background: "#111",
          borderBottom: "1px solid #222",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>
          ระบบเรียกคิว
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: connected ? "#4caf50" : "#e06060",
            }}
          />
          <span style={{ fontSize: 12, color: "#666" }}>
            {connected ? "เชื่อมต่อแล้ว" : "กำลังเชื่อมต่อ..."}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", gap: 0 }}>
        {/* NOW CALLING — ซ้าย */}
        <div
          style={{
            flex: 1,
            borderRight: "1px solid #222",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: "#888",
              marginBottom: 20,
              letterSpacing: ".1em",
            }}
          >
            กำลังเรียก
          </div>
          {board.nowCalling.length > 0 ? (
            board.nowCalling.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  fontSize: 120,
                  fontWeight: 800,
                  color: "#FFD700",
                  lineHeight: 1,
                  letterSpacing: "-.02em",
                  textShadow: "0 0 60px rgba(255,215,0,0.3)",
                }}
              >
                {ticket.displayCode}
              </div>
            ))
          ) : (
            <div style={{ fontSize: 48, color: "#333", fontWeight: 600 }}>
              —
            </div>
          )}
        </div>

        {/* WAITING LIST — ขวา */}
        <div
          style={{
            width: 320,
            display: "flex",
            flexDirection: "column",
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#666",
              marginBottom: 16,
              letterSpacing: ".08em",
            }}
          >
            รอคิว ({board.waitCount})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {board.waiting.slice(0, 12).map((ticket, i) => (
              <div
                key={ticket.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: i === 0 ? "#1a2a1a" : "#161616",
                  border: `1px solid ${i === 0 ? "#2d5a2d" : "#222"}`,
                  fontSize: 24,
                  fontWeight: 700,
                  color: i === 0 ? "#7fff7f" : "#888",
                }}
              >
                {ticket.displayCode}
              </div>
            ))}
            {board.waitCount > 12 && (
              <div style={{ textAlign: "center", color: "#444", fontSize: 12 }}>
                + อีก {board.waitCount - 12} คิว
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
