"use client";
import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loyaltyApi, orderApi, queueApi } from "@/lib/api";
import { getQueueSocket } from "@/lib/socket";

type OrderData = {
  id: string;
  status: string;
  total: number | string;
  branchId: string;
  table?: { name: string };
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number | string;
    modifiers?: Record<string, string>;
  }>;
};

type QueueData = {
  displayCode: string;
  status: string;
  aheadCount: number;
};

type LoyaltyData = {
  points: number;
  pointsEarned: number;
  tier?: { name: string; color: string };
};

const ORDER_STATUS: Record<string, { label: string; emoji: string; color: string }> = {
  PENDING:   { label: "รอส่งครัว",     emoji: "🕐", color: "text-amber-600" },
  CONFIRMED: { label: "ส่งครัวแล้ว",   emoji: "✅", color: "text-blue-600" },
  PREPARING: { label: "กำลังทำ",       emoji: "👨‍🍳", color: "text-orange-500" },
  READY:     { label: "พร้อมเสิร์ฟ",  emoji: "🔔", color: "text-green-600" },
  SERVED:    { label: "เสิร์ฟแล้ว",   emoji: "🍽️", color: "text-green-700" },
  COMPLETED: { label: "เสร็จสิ้น",     emoji: "🎉", color: "text-emerald-600" },
};

const QUEUE_STATUS: Record<string, string> = {
  WAITING: "รอเรียก",
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

  const [order, setOrder] = useState<OrderData | null>(null);
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
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
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-2 px-8 text-center">
        <p className="text-4xl">🔍</p>
        <p className="font-semibold">ไม่พบออเดอร์</p>
        <p className="text-sm text-muted-foreground">ลิงก์ใบเสร็จอาจหมดอายุหรือไม่ถูกต้อง</p>
      </div>
    );
  }

  const statusInfo = ORDER_STATUS[order.status];
  const total = Number(order.total);
  const isCalled = queue?.status === "CALLED";

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      {/* Hero status */}
      <div className="bg-background px-6 pt-10 pb-8 text-center border-b">
        <div className="text-5xl mb-3">{statusInfo?.emoji ?? "📋"}</div>
        <h1 className={`text-2xl font-bold ${statusInfo?.color ?? ""}`}>
          {statusInfo?.label ?? order.status}
        </h1>
        {order.table && (
          <p className="text-muted-foreground text-sm mt-1">
            โต๊ะ {order.table.name}
          </p>
        )}
        <p className="text-3xl font-bold mt-4">฿{total.toFixed(0)}</p>
      </div>

      <div className="px-4 pt-5 space-y-4 max-w-md mx-auto">
        {/* Queue card */}
        {queue && (
          <div
            className={`rounded-3xl p-6 text-center transition-colors ${
              isCalled
                ? "bg-green-500 text-white shadow-lg shadow-green-200"
                : "bg-background border"
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isCalled ? "text-green-100" : "text-muted-foreground"}`}>
              หมายเลขคิว
            </p>
            <p className={`text-6xl font-black tracking-tight ${isCalled ? "text-white" : ""}`}>
              {queue.displayCode}
            </p>
            <Badge
              variant={isCalled ? "secondary" : "outline"}
              className={`mt-3 text-sm px-4 py-1 ${isCalled ? "bg-white/20 text-white border-0" : ""}`}
            >
              {QUEUE_STATUS[queue.status] ?? queue.status}
            </Badge>
            {queue.status === "WAITING" && queue.aheadCount > 0 && (
              <p className={`text-xs mt-2 ${isCalled ? "text-green-100" : "text-muted-foreground"}`}>
                รออีก {queue.aheadCount} คิว · ~{queue.aheadCount * 3} นาที
              </p>
            )}
          </div>
        )}

        {/* Loyalty card */}
        {loyalty && (
          <div className="bg-background border rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">แต้มสะสม</p>
              {loyalty.tier && (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: loyalty.tier.color,
                    color: loyalty.tier.color,
                  }}
                  className="text-xs px-3"
                >
                  {loyalty.tier.name}
                </Badge>
              )}
            </div>
            <p className="text-4xl font-black">{loyalty.points}</p>
            <p className="text-sm text-muted-foreground mt-0.5">แต้มทั้งหมด</p>
            {loyalty.pointsEarned > 0 && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 inline-flex items-center gap-1.5">
                <span className="text-green-600 text-sm font-semibold">
                  +{loyalty.pointsEarned} แต้ม
                </span>
                <span className="text-xs text-green-500">จากออเดอร์นี้</span>
              </div>
            )}
          </div>
        )}

        {/* Order items */}
        <div className="bg-background border rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="font-semibold">รายการอาหาร</p>
          </div>

          <div className="divide-y">
            {order.items.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="flex items-start justify-between px-5 py-3.5 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {item.name}{" "}
                    <span className="text-muted-foreground font-normal">
                      ×{item.qty}
                    </span>
                  </p>
                  {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {Object.values(item.modifiers).join(" · ")}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold shrink-0">
                  ฿{(Number(item.unitPrice) * item.qty).toFixed(0)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-5 py-4 bg-muted/40 border-t">
            <p className="font-bold">ยอดรวม</p>
            <p className="font-black text-lg">฿{total.toFixed(0)}</p>
          </div>
        </div>

        {/* CTA — สมัคร member */}
        {!loyalty && (
          <div className="bg-primary text-primary-foreground rounded-3xl p-6 text-center">
            <p className="text-2xl mb-2">🎁</p>
            <p className="font-bold text-base">สมัครสมาชิกรับแต้มฟรี</p>
            <p className="text-sm opacity-80 mt-1 mb-4">
              สแกนใบเสร็จนี้ได้ภายใน 24 ชั่วโมง
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full px-6 font-semibold"
            >
              สมัครสมาชิก
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
