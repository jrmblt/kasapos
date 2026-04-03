import { receiptApi } from "@/lib/api";
import type { ReceiptData } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { PrintButton, ShareButton } from "./ReceiptActions";

const METHOD_LABELS: Record<string, string> = {
  CASH: "เงินสด",
  PROMPTPAY: "พร้อมเพย์",
  CREDIT_CARD: "บัตรเครดิต",
  DEBIT_CARD: "บัตรเดบิต",
};

async function getReceipt(token: string): Promise<ReceiptData | null> {
  try {
    return await receiptApi.get(token);
  } catch {
    return null;
  }
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await getReceipt(token);

  if (!receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-4xl mb-4">🧾</p>
          <h2 className="font-semibold text-lg mb-1">ไม่พบใบเสร็จ</h2>
          <p className="text-sm text-muted-foreground">ใบเสร็จนี้อาจหมดอายุหรือไม่มีอยู่</p>
        </div>
      </div>
    );
  }

  const paidAt = receipt.completedAt
    ? new Date(receipt.completedAt).toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Action bar — hidden when printing */}
      <div className="no-print px-4 py-3 bg-card border-b border-border flex items-center justify-between">
        <h1 className="font-semibold text-sm">ใบเสร็จรับเงิน</h1>
        <div className="flex gap-2">
          <ShareButton token={token} />
          <PrintButton />
        </div>
      </div>

      {/* Receipt content */}
      <div className="flex-1 flex justify-center bg-zinc-100 print:block print:bg-white">
        <div
          className="receipt-content w-full max-w-[320px] bg-white py-6 px-5 shadow-sm"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* Store header */}
          <div className="text-center mb-3">
            <p className="font-bold text-base tracking-wide uppercase">{receipt.branchName}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">ใบเสร็จรับเงิน / Receipt</p>
            {receipt.receiptNo && (
              <p className="text-[11px] text-zinc-500">เลขที่: {receipt.receiptNo}</p>
            )}
            <p className="text-[11px] text-zinc-500">{paidAt}</p>
            {receipt.tableName && (
              <p className="text-[11px] text-zinc-500">โต๊ะ: {receipt.tableName}</p>
            )}
          </div>

          <Divider />

          {/* Column header */}
          <div className="flex justify-between text-[10px] text-zinc-400 px-0 mt-2 mb-1">
            <span>รายการ</span>
            <span>จำนวนเงิน</span>
          </div>

          {/* Items */}
          <div className="space-y-1.5 mb-2">
            {receipt.items.map((item, idx) => (
              <div key={`${item.name}-${idx}`}>
                <div className="flex justify-between gap-1 text-[12px] leading-snug">
                  <span className="flex-1">{item.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatPrice(item.unitPrice * item.qty)}
                  </span>
                </div>
                {item.qty > 1 && (
                  <p className="text-[10px] text-zinc-400 pl-2">
                    {item.qty} x {formatPrice(item.unitPrice)}
                  </p>
                )}
                {(Object.keys(item.modifiers).length > 0 || item.note) && (
                  <p className="text-[10px] text-zinc-400 pl-2">
                    {Object.values(item.modifiers).join(", ")}
                    {item.note ? ` · ${item.note}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>

          <Divider />

          {/* Totals */}
          <div className="space-y-0.5 mt-2 text-[12px]">
            <Row label="รวม" value={formatPrice(receipt.subtotal)} />
            {receipt.discountAmt > 0 && (
              <Row label="ส่วนลด" value={`-${formatPrice(receipt.discountAmt)}`} />
            )}
          </div>

          <div className="flex justify-between font-bold text-[14px] border-t border-black pt-1 mt-1.5">
            <span>ยอดสุทธิ</span>
            <span className="tabular-nums">{formatPrice(receipt.total)}</span>
          </div>

          {/* Payments */}
          {receipt.payments.length > 0 && (
            <div className="space-y-0.5 text-[12px] mt-2">
              {receipt.payments.map((p, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: payment list has no stable id
                <div key={idx}>
                  <Row
                    label={METHOD_LABELS[p.method] ?? p.method}
                    value={formatPrice(p.amount)}
                  />
                  {p.cashReceived != null && (
                    <Row label="รับมา" value={formatPrice(p.cashReceived)} />
                  )}
                  {p.changeAmt != null && p.changeAmt > 0 && (
                    <Row label="เงินทอน" value={formatPrice(p.changeAmt)} />
                  )}
                </div>
              ))}
            </div>
          )}

          <Divider />

          {/* Footer */}
          <p className="text-center text-[11px] text-zinc-500 mt-3">ขอบคุณที่ใช้บริการ</p>
          <p className="text-center text-[10px] text-zinc-400 mt-0.5">Powered by Kasa POS</p>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-zinc-300 my-1" />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}

