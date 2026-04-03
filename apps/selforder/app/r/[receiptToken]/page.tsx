"use client";
import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loyaltyApi, orderApi, queueApi } from "@/lib/api";
import { getQueueSocket } from "@/lib/socket";

interface OrderItem {
  name: string;
  qty: number;
  unitPrice: number | string;
  modifiers?: Record<string, string>;
  note?: string;
}
interface ReceiptOrder {
  id: string;
  status: string;
  total: number | string;
  receiptNo?: string;
  branchId?: string;
  table?: { name: string };
  items: OrderItem[];
}
interface QueueInfo {
  displayCode: string;
  status: string;
  aheadCount: number;
}
interface LoyaltyInfo {
  points: number;
  pointsEarned: number;
  tier?: { name: string; color: string };
}

const ORDER_STATUS: Record<string, { label: string; icon: string; color: string }> = {
  PENDING:    { label: "รอส่งครัว",       icon: "🕐", color: "text-amber-600" },
  CONFIRMED:  { label: "ส่งครัวแล้ว",    icon: "✅", color: "text-blue-600" },
  PREPARING:  { label: "กำลังปรุงอาหาร", icon: "👨‍🍳", color: "text-orange-600" },
  READY:      { label: "พร้อมเสิร์ฟ",    icon: "🔔", color: "text-green-600" },
  SERVED:     { label: "เสิร์ฟแล้ว",      icon: "🍽️", color: "text-green-700" },
  COMPLETED:  { label: "เสร็จสิ้น",       icon: "✔️", color: "text-muted-foreground" },
};

const QUEUE_STATUS: Record<string, string> = {
  WAITING: "กำลังรอคิว",
  CALLED:  "เรียกแล้ว!",
  DONE:    "รับแล้ว",
  SKIPPED: "ข้ามคิว",
};

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ receiptToken: string }>;
}) {
  const { receiptToken } = use(params);

  const [order, setOrder]     = useState<ReceiptOrder | null>(null);
  const [queue, setQueue]     = useState<QueueInfo | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const o = await orderApi.getByReceipt(receiptToken);
        setOrder(o);

        const [q, l] = await Promise.all([
          queueApi.getByOrder(o.id).catch(() => null),
          loyaltyApi.getByOrder(o.id).catch(() => null),
        ]);
        setQueue(q);
        setLoyalty(l);

        if (q && o.branchId) {
          const socket = getQueueSocket(o.branchId);
          socket.on("board:updated", async () => {
            const updated = await queueApi.getByOrder(o.id).catch(() => null);
            setQueue(updated);
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [receiptToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">ไม่พบออเดอร์</p>
      </div>
    );
  }

  const statusInfo = ORDER_STATUS[order.status] ?? {
    label: order.status,
    icon: "📋",
    color: "text-foreground",
  };
  const isCalled = queue?.status === "CALLED";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-md mx-auto px-4 pt-6 pb-16 space-y-4">

        {/* ── Order status hero ────────────────────────── */}
        <div className="bg-card border rounded-3xl p-6 text-center space-y-1 shadow-sm">
          <span className="text-4xl">{statusInfo.icon}</span>
          <p className={`text-xl font-bold mt-2 ${statusInfo.color}`}>
            {statusInfo.label}
          </p>
          {order.table && (
            <p className="text-sm text-muted-foreground">โต๊ะ {order.table.name}</p>
          )}
          {order.receiptNo && (
            <p className="text-xs text-muted-foreground mt-1 font-mono tracking-wider">
              #{order.receiptNo}
            </p>
          )}
        </div>

        {/* ── Queue ───────────────────────────────────── */}
        {queue && (
          <div
            className={`rounded-3xl p-6 text-center border shadow-sm transition-colors ${
              isCalled
                ? "bg-green-50 border-green-300"
                : "bg-card border-border"
            }`}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              คิวของคุณ
            </p>
            <p
              className={`text-6xl font-black tracking-tight ${
                isCalled ? "text-green-600" : "text-foreground"
              }`}
            >
              {queue.displayCode}
            </p>
            <Badge
              variant={isCalled ? "default" : "secondary"}
              className={`mt-3 text-sm px-3 py-0.5 ${
                isCalled ? "bg-green-500 hover:bg-green-500" : ""
              }`}
            >
              {isCalled && "🔔 "}
              {QUEUE_STATUS[queue.status] ?? queue.status}
            </Badge>
            {queue.status === "WAITING" && queue.aheadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                รออีก {queue.aheadCount} คิว (ประมาณ {queue.aheadCount * 3} นาที)
              </p>
            )}
          </div>
        )}

        {/* ── Loyalty ─────────────────────────────────── */}
        {loyalty && (
          <div className="bg-card border rounded-3xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              แต้มสะสม
            </p>
            <div className="flex items-end justify-between gap-3">
              <div>
                {loyalty.pointsEarned > 0 && (
                  <p className="text-sm text-green-600 font-semibold mb-0.5">
                    +{loyalty.pointsEarned} แต้มจากออเดอร์นี้
                  </p>
                )}
                <p className="text-3xl font-black">
                  {loyalty.points}
                  <span className="text-base font-medium text-muted-foreground ml-1">
                    แต้ม
                  </span>
                </p>
              </div>
              {loyalty.tier && (
                <Badge
                  variant="outline"
                  className="text-sm px-3 py-1 shrink-0"
                  style={{
                    borderColor: loyalty.tier.color,
                    color: loyalty.tier.color,
                  }}
                >
                  {loyalty.tier.name}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* ── Order items ─────────────────────────────── */}
        <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b">
            <p className="font-semibold text-sm">รายการอาหาร</p>
          </div>

          <div className="divide-y">
            {order.items.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="flex items-start justify-between px-5 py-3.5 gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {item.name}
                    <span className="text-muted-foreground font-normal ml-1">
                      ×{item.qty}
                    </span>
                  </p>
                  {item.modifiers &&
                    Object.keys(item.modifiers).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {Object.values(
                          item.modifiers as Record<string, string>,
                        ).join(" · ")}
                      </p>
                    )}
                  {item.note && (
                    <p className="text-xs text-amber-600 mt-0.5 truncate">
                      ⚑ {item.note}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold shrink-0">
                  ฿{(Number(item.unitPrice) * item.qty).toFixed(0)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/30">
            <span className="font-bold">ยอดรวม</span>
            <span className="font-bold text-lg">
              ฿{Number(order.total).toFixed(0)}
            </span>
          </div>
        </div>

        {/* ── CTA สมัครสมาชิก ─────────────────────────── */}
        {!loyalty && (
          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 text-center space-y-2">
            <p className="text-2xl">🎁</p>
            <p className="font-semibold text-sm">
              สมัครสมาชิกรับแต้มจากออเดอร์นี้
            </p>
            <p className="text-xs text-muted-foreground">
              สะสมแต้ม · รับส่วนลดพิเศษ · ติดตาม order
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full mt-1 border-primary/40 text-primary"
            >
              สมัครสมาชิกฟรี
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
