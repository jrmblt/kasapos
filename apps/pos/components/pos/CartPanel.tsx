import { useState as useStateCart } from "react";
import type { Order, OrderItem } from "@/app/lib/types";
import { Button as ButtonCart } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VoidDialog } from "./VoidDialog";

const ITEM_STATUS_STYLE: Record<string, string> = {
  PENDING: "text-zinc-300",
  PREPARING: "text-amber-400",
  DONE: "text-green-400",
  VOIDED: "text-zinc-600 line-through",
};

const ITEM_STATUS_ICON: Record<string, string> = {
  PREPARING: " 🔥",
  DONE: " ✓",
  VOIDED: "",
  PENDING: "",
};

interface CartPanelProps {
  order: Order | null;
  tableName: string;
  onAddMore: () => void;
  onPayment: () => void;
  onVoidItem: (itemId: string, reason: string, pin: string) => Promise<void>;
  onRefresh: () => void;
}

export function CartPanel({
  order,
  tableName,
  onAddMore,
  onPayment,
  onVoidItem,
  onRefresh,
}: CartPanelProps) {
  const [voidItemId, setVoidItemId] = useStateCart<string | null>(null);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 select-none gap-3 px-6">
        <span className="text-5xl">🍽️</span>
        {tableName ? (
          <>
            <p className="text-sm text-zinc-400">โต๊ะ {tableName} — ยังไม่มีออเดอร์</p>
            <ButtonCart
              onClick={onAddMore}
              className="mt-2 h-11 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-semibold"
            >
              + เริ่มสั่งอาหาร
            </ButtonCart>
          </>
        ) : (
          <p className="text-sm">เลือกโต๊ะเพื่อเริ่มออเดอร์</p>
        )}
      </div>
    );
  }

  const isPaid = order.payments?.some((p) => p.status === "CONFIRMED") ?? false;
  const activeItems = (order.items ?? []).filter((i) => i.status !== "VOIDED");
  const hasItems = activeItems.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0 flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">
            {tableName ? `โต๊ะ ${tableName}` : "Takeaway"}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeItems.length} รายการ
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
        >
          ↻ รีเฟรช
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto py-1">
        {order.items.map((item: OrderItem) => {
          const statusStyle = ITEM_STATUS_STYLE[item.status] ?? "text-zinc-300";
          const statusIcon = ITEM_STATUS_ICON[item.status] ?? "";
          const isVoided = item.status === "VOIDED";
          const modValues = Object.values(item.modifiers);

          return (
            <div
              key={item.id}
              className="flex items-start gap-2 px-3 py-2 hover:bg-zinc-800/40 group transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium leading-tight ${statusStyle}`}
                >
                  {item.qty}× {item.name}
                  {statusIcon}
                </p>
                {modValues.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {modValues.join(" · ")}
                  </p>
                )}
                {item.note && (
                  <p className="text-xs text-amber-600 mt-0.5">⚑ {item.note}</p>
                )}
                {isVoided && item.voidReason && (
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {item.voidReason}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 ml-1 shrink-0">
                <span
                  className={`text-sm ${isVoided ? "text-zinc-600" : "text-zinc-300"}`}
                >
                  ฿{(Number(item.unitPrice) * item.qty).toFixed(0)}
                </span>
                {!isVoided && !isPaid && (
                  <button
                    type="button"
                    onClick={() => setVoidItemId(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-400 transition-opacity px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Separator className="bg-zinc-800 shrink-0" />

      {/* Summary */}
      <div className="px-4 py-3 shrink-0 space-y-1.5">
        <div className="flex justify-between text-sm text-zinc-400">
          <span>ยอดรวม</span>
          <span>฿{Number(order.subtotal).toFixed(0)}</span>
        </div>
        {Number(order.discountAmt) > 0 && (
          <div className="flex justify-between text-sm text-green-400">
            <span>ส่วนลด</span>
            <span>-฿{Number(order.discountAmt).toFixed(0)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base text-white pt-1">
          <span>รวม</span>
          <span>฿{Number(order.total).toFixed(0)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-4 shrink-0 space-y-2">
        {isPaid ? (
          <div className="text-center text-green-400 font-medium py-3">
            ✓ ชำระเงินแล้ว
          </div>
        ) : (
          <>
            <ButtonCart
              onClick={onPayment}
              disabled={!hasItems}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-base font-semibold"
            >
              ชำระเงิน ฿{Number(order.total).toFixed(0)}
            </ButtonCart>
            <ButtonCart
              variant="outline"
              onClick={onAddMore}
              className="w-full h-10 rounded-xl border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              + เพิ่มรายการ
            </ButtonCart>
          </>
        )}
      </div>

      <VoidDialog
        open={!!voidItemId}
        onClose={() => setVoidItemId(null)}
        onConfirm={async (reason, pin) => {
          if (voidItemId) await onVoidItem(voidItemId, reason, pin);
        }}
      />
    </div>
  );
}
