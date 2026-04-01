"use client";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { shiftApi } from "@/app/lib/api";
import type { Shift } from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import { usePosAuth } from "@/hooks/usePosAuth";

type View = "loading" | "open" | "active" | "closed";

export default function ShiftPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);
  const router = useRouter();
  const { user, hydrated } = usePosAuth();

  const [view, setView] = useState<View>("loading");
  const [shift, setShift] = useState<Shift | null>(null);
  const [cashInput, setCashInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const userId = user.id;
    cancelledRef.current = false;

    async function load() {
      try {
        const current = await shiftApi.current(branchId, userId);
        if (cancelledRef.current) return;
        if (current) {
          setShift(current);
          setView("active");
        } else {
          setView("open");
        }
      } catch {
        if (!cancelledRef.current) setView("open");
      }
    }

    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [branchId, hydrated, user, router]);

  const handleOpen = useCallback(async () => {
    if (!user) return;
    const amount = Number(cashInput);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("กรุณาระบุจำนวนเงินเปิดกะ");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const s = await shiftApi.open(branchId, user.id, amount);
      setShift(s);
      setCashInput("");
      setView("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปิดกะไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [branchId, user, cashInput]);

  const handleClose = useCallback(async () => {
    if (!shift) return;
    const amount = Number(cashInput);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("กรุณาระบุจำนวนเงินปิดกะ");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const s = await shiftApi.close(shift.id, amount);
      setShift(s);
      setCashInput("");
      setView("closed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ปิดกะไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [shift, cashInput]);

  if (!hydrated || !user) return null;

  const fmt = (n: number | null | undefined) =>
    n != null ? `฿${Number(n).toLocaleString()}` : "—";

  const fmtTime = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Topbar ─────────────────────────────────────────── */}
      <header className="h-12 flex items-center justify-between px-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="font-bold text-violet-400">Kasa POS</span>
          <span className="text-zinc-700">|</span>
          <span className="text-sm text-zinc-300">กะการทำงาน</span>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/${branchId}`)}
          className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          กลับหน้าหลัก
        </button>
      </header>

      <div className="flex items-center justify-center p-6" style={{ minHeight: "calc(100vh - 48px)" }}>
        <div className="w-full max-w-md space-y-6">
          {/* ── Loading ──────────────────────────────────── */}
          {view === "loading" && (
            <p className="text-center text-zinc-500 text-sm">กำลังโหลด...</p>
          )}

          {/* ── Open Shift Form ──────────────────────────── */}
          {view === "open" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold">เปิดกะใหม่</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  ระบุจำนวนเงินสดตั้งต้นในลิ้นชัก
                </p>
              </div>

              <div>
                <label htmlFor="openCash" className="text-sm text-zinc-400 block mb-1.5">
                  เงินสดเปิดกะ (บาท)
                </label>
                <input
                  id="openCash"
                  type="number"
                  inputMode="numeric"
                  value={cashInput}
                  onChange={(e) => {
                    setCashInput(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleOpen()}
                  placeholder="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl text-center focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashInput(String(amt))}
                    className="py-2 text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
                  >
                    ฿{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <Button
                type="button"
                onClick={handleOpen}
                disabled={loading || !cashInput}
                className="w-full h-12 rounded-xl text-base font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? "กำลังเปิดกะ..." : "เปิดกะ"}
              </Button>
            </div>
          )}

          {/* ── Active Shift ─────────────────────────────── */}
          {view === "active" && shift && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-green-950 border border-green-800 rounded-full px-4 py-1 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">กะเปิดอยู่</span>
                </div>
                <h2 className="text-xl font-bold">กะของ {user.name}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-zinc-500">เงินสดเปิดกะ</p>
                  <p className="text-lg font-bold mt-0.5">{fmt(shift.openCash)}</p>
                </div>
                <div className="bg-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-zinc-500">เปิดเมื่อ</p>
                  <p className="text-lg font-bold mt-0.5">{fmtTime(shift.openedAt)}</p>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-5 space-y-3">
                <p className="text-sm text-zinc-400 text-center">ปิดกะ</p>
                <div>
                  <label htmlFor="closeCash" className="text-sm text-zinc-400 block mb-1.5">
                    เงินสดนับจริง (บาท)
                  </label>
                  <input
                    id="closeCash"
                    type="number"
                    inputMode="numeric"
                    value={cashInput}
                    onChange={(e) => {
                      setCashInput(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleClose()}
                    placeholder="0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl text-center focus:outline-none focus:border-violet-500"
                  />
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <Button
                  type="button"
                  onClick={handleClose}
                  disabled={loading || !cashInput}
                  className="w-full h-12 rounded-xl text-base font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "กำลังปิดกะ..." : "ปิดกะ"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Closed Shift Summary ─────────────────────── */}
          {view === "closed" && shift && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold">สรุปกะ</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  {fmtTime(shift.openedAt)} — {fmtTime(shift.closedAt)}
                </p>
              </div>

              <div className="space-y-2">
                <Row label="เงินสดเปิดกะ" value={fmt(shift.openCash)} />
                <Row label="ยอดขายเงินสด (คำนวณ)" value={fmt(Number(shift.expectedCash ?? 0) - Number(shift.openCash))} />
                <Row label="เงินสดที่ควรมี" value={fmt(shift.expectedCash)} bold />
                <Row label="นับจริง" value={fmt(shift.closeCash)} />
                <div className="border-t border-zinc-800 pt-2">
                  <Row
                    label="ผลต่าง"
                    value={fmt(shift.difference)}
                    bold
                    color={
                      shift.difference == null
                        ? "text-zinc-400"
                        : Number(shift.difference) === 0
                          ? "text-green-400"
                          : Number(shift.difference) > 0
                            ? "text-blue-400"
                            : "text-red-400"
                    }
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={() => router.push(`/${branchId}`)}
                className="w-full h-12 rounded-xl text-base font-semibold bg-violet-600 hover:bg-violet-700"
              >
                กลับหน้าหลัก
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-400">{label}</span>
      <span
        className={[
          "text-sm",
          bold ? "font-bold" : "",
          color ?? "text-white",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
