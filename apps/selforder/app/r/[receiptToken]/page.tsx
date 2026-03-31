"use client";
import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loyaltyApi, orderApi, queueApi } from "@/lib/api";
import { getQueueSocket } from "@/lib/socket";

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ receiptToken: string }>;
}) {
  const { receiptToken } = use(params);

  const [order, setOrder] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
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

        // realtime queue update
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
      <div className="flex items-center justify-center min-h-screen">
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

  const statusLabel: Record<string, string> = {
    PENDING: "รอส่งครัว",
    CONFIRMED: "ส่งครัวแล้ว",
    PREPARING: "กำลังทำ",
    READY: "พร้อมเสิร์ฟ",
    SERVED: "เสิร์ฟแล้ว",
    COMPLETED: "เสร็จสิ้น",
  };

  const queueStatusLabel: Record<string, string> = {
    WAITING: "รอเรียก",
    CALLED: "เรียกแล้ว!",
    DONE: "รับแล้ว",
    SKIPPED: "ข้ามคิว",
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto p-4 space-y-4 pb-12">
      {/* Order status */}
      <div className="bg-card border rounded-2xl p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">สถานะออเดอร์</p>
        <p className="text-2xl font-bold">
          {statusLabel[order.status] ?? order.status}
        </p>
        {order.table && (
          <p className="text-sm text-muted-foreground mt-1">
            โต๊ะ {order.table.name}
          </p>
        )}
      </div>

      {/* Queue */}
      {queue && (
        <div
          className={`border rounded-2xl p-4 text-center ${
            queue.status === "CALLED"
              ? "bg-green-50 border-green-300"
              : "bg-card"
          }`}
        >
          <p className="text-xs text-muted-foreground mb-1">คิวของคุณ</p>
          <p
            className={`text-4xl font-bold ${
              queue.status === "CALLED" ? "text-green-600" : ""
            }`}
          >
            {queue.displayCode}
          </p>
          <Badge
            variant={queue.status === "CALLED" ? "default" : "secondary"}
            className="mt-2"
          >
            {queueStatusLabel[queue.status] ?? queue.status}
          </Badge>
          {queue.status === "WAITING" && queue.aheadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              รออีก {queue.aheadCount} คิว (~{queue.aheadCount * 3} นาที)
            </p>
          )}
        </div>
      )}

      {/* Loyalty */}
      {loyalty && (
        <div className="bg-card border rounded-2xl p-4">
          <p className="text-sm font-medium mb-3">แต้มสะสม</p>
          <div className="flex items-center justify-between">
            <div>
              {loyalty.pointsEarned > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  +{loyalty.pointsEarned} แต้มจากออเดอร์นี้
                </p>
              )}
              <p className="text-2xl font-bold">{loyalty.points} แต้ม</p>
            </div>
            {loyalty.tier && (
              <Badge
                variant="outline"
                style={{
                  borderColor: loyalty.tier.color,
                  color: loyalty.tier.color,
                }}
                className="text-sm px-3 py-1"
              >
                {loyalty.tier.name}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="bg-card border rounded-2xl">
        <div className="px-4 py-3 border-b">
          <p className="font-medium text-sm">รายการ</p>
        </div>
        {order.items.map((item: any, i: number) => (
          <div
            key={`${item.name}-${i}`}
            className="flex justify-between px-4 py-3 border-b last:border-0"
          >
            <div>
              <p className="text-sm">
                {item.name} ×{item.qty}
              </p>
              {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {Object.values(item.modifiers as Record<string, string>).join(
                    " · ",
                  )}
                </p>
              )}
            </div>
            <p className="text-sm font-medium">
              ฿{(Number(item.unitPrice) * item.qty).toFixed(0)}
            </p>
          </div>
        ))}
        <div className="flex justify-between px-4 py-3 font-semibold">
          <span>รวม</span>
          <span>฿{Number(order.total).toFixed(0)}</span>
        </div>
      </div>

      {/* CTA — สมัคร member ถ้ายังไม่ได้สมัคร */}
      {!loyalty && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
          <p className="font-medium text-sm">สมัครสมาชิกเพื่อรับแต้มจากออเดอร์นี้</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            สแกนใบเสร็จนี้ได้ภายใน 24 ชั่วโมง
          </p>
          <Button variant="outline" size="sm" className="rounded-full">
            สมัครสมาชิก
          </Button>
        </div>
      )}
    </div>
  );
}
