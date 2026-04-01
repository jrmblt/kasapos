"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { paymentApi } from "@/app/lib/api";
import type {
  CashPaymentResult,
  Order,
  PromptPayResult,
} from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Mode = "select" | "cash" | "promptpay" | "success";

interface SuccessData {
  changeAmt: number;
  receiptToken: string | null;
  method: "CASH" | "PROMPTPAY";
}

interface Props {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onPaid: () => void;
}

export function PaymentDialog({ open, order, onClose, onPaid }: Props) {
  const [mode, setMode] = useState<Mode>("select");
  const [cashInput, setCashInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // ref สำหรับ cleanup interval — ไม่ทำให้ re-render
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const total = Number(order?.total ?? 0);
  const change = Math.max(0, Number(cashInput || 0) - total);

  // reset เมื่อ open เปลี่ยน
  useEffect(() => {
    if (open) {
      setMode("select");
      setCashInput("");
      setQrUrl("");
      setPaymentId("");
      setSuccessData(null);
      setError("");
      setLoading(false);
      cancelledRef.current = false;
    } else {
      // cleanup polling เมื่อปิด dialog
      stopPolling();
    }
  }, [open]);

  // cleanup เมื่อ unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopPolling();
    };
  }, []);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function startPolling(pid: string) {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      if (cancelledRef.current) {
        stopPolling();
        return;
      }
      try {
        const s = await paymentApi.status(pid);
        if (s.status === "CONFIRMED" && !cancelledRef.current) {
          stopPolling();
          setSuccessData({
            changeAmt: 0,
            receiptToken: null,
            method: "PROMPTPAY",
          });
          setMode("success");
          // auto-close หลัง 2 วินาที
          setTimeout(() => {
            if (!cancelledRef.current) onPaid();
          }, 2000);
        }
      } catch {
        // network error — ลองใหม่รอบถัดไป
      }
    }, 2500);
  }

  async function handleCash() {
    if (!order) return;
    const received = Number(cashInput);
    if (isNaN(received) || received < total) {
      setError(`รับเงินไม่พอ (ต้องการ ฿${total.toFixed(0)})`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res: CashPaymentResult = await paymentApi.cash({
        orderId: order.id,
        branchId: order.branchId,
        cashReceived: received,
      });
      setSuccessData({
        changeAmt: res.changeAmt,
        receiptToken: res.receiptToken,
        method: "CASH",
      });
      setMode("success");
      // auto-close หลัง 3 วินาที (cashier เห็นเงินทอน)
      setTimeout(() => {
        if (!cancelledRef.current) onPaid();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function handlePromptPay() {
    if (!order) return;
    setLoading(true);
    setError("");
    try {
      const res: PromptPayResult = await paymentApi.promptpay(order.id);
      setQrUrl(res.qrCodeUrl);
      setPaymentId(res.paymentId);
      setMode("promptpay");
      startPolling(res.paymentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function handleMockConfirm() {
    if (!paymentId) return;
    try {
      await paymentApi.mockConfirm(paymentId);
    } catch (err) {
      console.error("mock confirm error:", err);
    }
  }

  function handleBack() {
    stopPolling();
    setMode("select");
    setQrUrl("");
    setPaymentId("");
    setError("");
    setCashInput("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          stopPolling();
          onClose();
        }
      }}
    >
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === "success"
              ? "ชำระเงินสำเร็จ"
              : `ชำระเงิน ฿${total.toFixed(0)}`}
          </DialogTitle>
        </DialogHeader>

        {/* ── Select mode ─────────────────────────────────── */}
        {mode === "select" && (
          <div className="space-y-3 py-2">
            <Button
              type="button"
              onClick={() => setMode("cash")}
              className="w-full h-14 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-base justify-start px-5"
            >
              💵&nbsp;&nbsp;เงินสด
            </Button>
            <Button
              type="button"
              onClick={handlePromptPay}
              disabled={loading}
              className="w-full h-14 rounded-xl bg-violet-600 hover:bg-violet-700 text-base justify-start px-5"
            >
              📱&nbsp;&nbsp;{loading ? "กำลังสร้าง QR..." : "PromptPay QR"}
            </Button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* ── Cash ────────────────────────────────────────── */}
        {mode === "cash" && (
          <div className="space-y-4 py-2">
            <div className="bg-zinc-800 rounded-xl p-4 text-center">
              <p className="text-sm text-zinc-400">ยอดที่ต้องชำระ</p>
              <p className="text-3xl font-bold text-white mt-1">
                ฿{total.toFixed(0)}
              </p>
            </div>

            <div>
              <label
                htmlFor="cashInput"
                className="text-sm text-zinc-400 block mb-1.5"
              >
                รับเงินมา (บาท)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={cashInput}
                onChange={(e) => {
                  setCashInput(e.target.value);
                  setError("");
                }}
                placeholder="0"
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl text-center focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[20, 50, 100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() =>
                    setCashInput(String(Math.ceil(total / amt) * amt))
                  }
                  className="py-2 text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
                >
                  ฿{amt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCashInput(String(Math.ceil(total)))}
                className="py-2 text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
              >
                พอดี
              </button>
            </div>

            {cashInput && Number(cashInput) >= total && (
              <div className="bg-green-950 border border-green-800 rounded-xl p-3 text-center">
                <p className="text-sm text-green-400">เงินทอน</p>
                <p className="text-3xl font-bold text-green-300">
                  ฿{change.toFixed(0)}
                </p>
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 text-zinc-400 hover:text-white"
              >
                ย้อนกลับ
              </Button>
              <Button
                type="button"
                onClick={handleCash}
                disabled={loading || !cashInput || Number(cashInput) < total}
                className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl"
              >
                {loading ? "กำลังบันทึก..." : "รับชำระเงิน"}
              </Button>
            </div>
          </div>
        )}

        {/* ── PromptPay QR ─────────────────────────────────── */}
        {mode === "promptpay" && (
          <div className="space-y-4 py-2 text-center">
            {qrUrl ? (
              <>
                <div className="bg-white p-3 rounded-xl inline-block mx-auto">
                  <Image
                    src={qrUrl}
                    alt="PromptPay QR"
                    width={200}
                    height={200}
                    unoptimized
                  />
                </div>
                <p className="text-sm text-zinc-400 animate-pulse">
                  รอการยืนยันการชำระเงิน...
                </p>
                {process.env.NODE_ENV === "development" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMockConfirm}
                    className="border-zinc-700 text-zinc-400 text-xs hover:text-white"
                  >
                    [Dev] Mock confirm
                  </Button>
                )}
              </>
            ) : (
              <p className="text-zinc-400 text-sm py-8">กำลังสร้าง QR...</p>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              className="text-zinc-400 hover:text-white"
            >
              ยกเลิก
            </Button>
          </div>
        )}

        {/* ── Success ──────────────────────────────────────── */}
        {mode === "success" && successData && (
          <div className="text-center space-y-4 py-4">
            <div className="text-6xl">✓</div>
            <p className="text-green-400 font-semibold text-xl">ชำระเงินสำเร็จ</p>

            {Number(successData.changeAmt) > 0 && (
              <div className="bg-zinc-800 rounded-xl p-4">
                <p className="text-zinc-400 text-sm">เงินทอน</p>
                <p className="text-4xl font-bold text-white mt-1">
                  ฿{Number(successData.changeAmt).toFixed(0)}
                </p>
              </div>
            )}

            {successData.receiptToken && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">
                  QR สำหรับลูกค้าดูคิว / สะสมแต้ม
                </p>
                <div className="bg-white p-2 rounded-lg inline-block">
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/r/${successData.receiptToken}`}
                    alt="Receipt QR"
                    width={120}
                    height={120}
                    unoptimized
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-zinc-600">ปิดอัตโนมัติ...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
