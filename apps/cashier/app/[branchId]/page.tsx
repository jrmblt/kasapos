"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useId, useRef, useState } from "react";
import { useCashierAuth } from "@/hooks/useCashierAuth";
import {
  menuApi,
  orderApi,
  paymentApi,
  tableApi,
} from "@/lib/api";
import type {
  Category,
  MenuItem,
  Modifier,
  Order,
  OrderItemModifiers,
  PromptPayResult,
  Table,
} from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "tables" | "order" | "menu";
type PaymentMode = "select" | "cash" | "promptpay" | "success";

interface SelectedModifiers {
  [modifierId: string]: string | string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TABLE_STATUS_CONFIG = {
  AVAILABLE: { label: "ว่าง", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400" },
  OCCUPIED: { label: "มีลูกค้า", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-400" },
  RESERVED: { label: "จอง", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-400" },
  CLEANING: { label: "ทำความสะอาด", bg: "bg-zinc-50", border: "border-zinc-200", text: "text-zinc-600", dot: "bg-zinc-400" },
};

// ─── Modifier Sheet ───────────────────────────────────────────────────────────

function ModifierSheet({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, qty: number, mods: SelectedModifiers, note: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [mods, setMods] = useState<SelectedModifiers>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    if (item) {
      setQty(1);
      setMods({});
      setNote("");
    }
  }, [item]);

  if (!item) return null;

  const totalExtra = item.modifiers.reduce((sum, mod) => {
    const sel = mods[mod.id];
    if (!sel) return sum;
    const keys = Array.isArray(sel) ? sel : [sel];
    return sum + keys.reduce((s, k) => {
      const opt = mod.options.find((o) => o.name === k);
      return s + (opt?.priceAdd ?? 0);
    }, 0);
  }, 0);
  const lineTotal = (item.price + totalExtra) * qty;

  const allRequired = item.modifiers
    .filter((m) => m.isRequired)
    .every((m) => {
      const v = mods[m.id];
      return v && (Array.isArray(v) ? v.length >= m.minSelect : v.length > 0);
    });

  const toggleOption = (mod: Modifier, optName: string) => {
    if (mod.type === "SINGLE_SELECT") {
      setMods((p) => ({ ...p, [mod.id]: optName }));
    } else {
      const prev = (mods[mod.id] as string[] | undefined) ?? [];
      const next = prev.includes(optName) ? prev.filter((x) => x !== optName) : [...prev, optName];
      setMods((p) => ({ ...p, [mod.id]: next }));
    }
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40"
        aria-label="ปิด"
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 shrink-0 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                ฿{formatPrice(item.price + totalExtra)} / ชิ้น
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-muted-foreground text-xl leading-none p-1">
              ✕
            </button>
          </div>
        </div>

        {/* Scroll body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {item.modifiers.map((mod) => (
            <div key={mod.id}>
              <div className="flex items-center gap-2 mb-2">
                <p className="font-medium text-sm">{mod.name}</p>
                {mod.isRequired && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">จำเป็น</span>
                )}
                {!mod.isRequired && (
                  <span className="text-[10px] text-muted-foreground">(เลือกได้)</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {mod.options.map((opt) => {
                  const sel = mods[mod.id];
                  const isSelected = Array.isArray(sel)
                    ? sel.includes(opt.name)
                    : sel === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => toggleOption(mod, opt.name)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-sm border transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground",
                      )}
                    >
                      {opt.name}
                      {opt.priceAdd > 0 && (
                        <span className={cn("ml-1", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          +{opt.priceAdd}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Note */}
          <div>
            <p className="font-medium text-sm mb-2">หมายเหตุ</p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ไม่ใส่ผัก, เพิ่มเผ็ด ..."
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] border-t border-border bg-card shrink-0">
          <div className="flex items-center gap-4 mb-3">
            <p className="text-sm text-muted-foreground">จำนวน</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-lg font-bold text-foreground active:bg-muted"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold active:opacity-80"
              >
                +
              </button>
            </div>
            <span className="ml-auto font-bold text-lg">฿{formatPrice(lineTotal)}</span>
          </div>
          <button
            type="button"
            disabled={!allRequired}
            onClick={() => onAdd(item, qty, mods, note)}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            เพิ่มลงออเดอร์
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Payment Sheet ────────────────────────────────────────────────────────────

function PaymentSheet({
  open,
  order,
  onClose,
  onPaid,
}: {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onPaid: (receiptToken: string | null) => void;
}) {
  const [mode, setMode] = useState<PaymentMode>("select");
  const [cashInput, setCashInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrData, setQrData] = useState<PromptPayResult | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cashInputId = useId();

  useEffect(() => {
    if (!open) {
      setMode("select");
      setCashInput("");
      setError("");
      setQrData(null);
      if (pollerRef.current) clearInterval(pollerRef.current);
    }
  }, [open]);

  if (!open || !order) return null;

  const cashAmt = Number.parseFloat(cashInput) || 0;
  const change = cashAmt - order.total;

  const handleCashPay = async () => {
    if (cashAmt < order.total) { setError("รับเงินน้อยกว่ายอดที่ต้องชำระ"); return; }
    setLoading(true); setError("");
    try {
      const res = await paymentApi.cash({ orderId: order.id, branchId: order.branchId, cashReceived: cashAmt });
      setMode("success");
      setTimeout(() => onPaid(res.receiptToken), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ชำระเงินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handlePromptPay = async () => {
    setLoading(true); setError("");
    try {
      const res = await paymentApi.promptpay(order.id);
      setQrData(res);
      setMode("promptpay");

      // Poll for payment status
      pollerRef.current = setInterval(async () => {
        try {
          const s = await paymentApi.status(res.paymentId);
          if (s.status === "CONFIRMED") {
            if (pollerRef.current) clearInterval(pollerRef.current);
            setMode("success");
            setTimeout(() => onPaid(order.receiptToken), 300);
          }
        } catch { /* silent */ }
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้าง QR ไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleMockConfirm = async () => {
    if (!qrData) return;
    await paymentApi.mockConfirm(qrData.paymentId);
  };

  return (
    <>
      <button type="button" onClick={onClose} className="fixed inset-0 bg-black/40 z-40" aria-label="ปิด" />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Select mode */}
        {mode === "select" && (
          <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2">
            <h3 className="font-semibold text-lg mb-1">ชำระเงิน</h3>
            <p className="text-2xl font-bold text-primary mb-6">฿{formatPrice(order.total)}</p>

            {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl mb-4">{error}</div>}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMode("cash")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border bg-background active:bg-muted"
              >
                <span className="text-2xl">💵</span>
                <div className="text-left">
                  <p className="font-semibold">เงินสด</p>
                  <p className="text-xs text-muted-foreground">รับเงินสดและทอนเงิน</p>
                </div>
              </button>
              <button
                type="button"
                onClick={handlePromptPay}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border bg-background active:bg-muted disabled:opacity-50"
              >
                <span className="text-2xl">📱</span>
                <div className="text-left">
                  <p className="font-semibold">พร้อมเพย์</p>
                  <p className="text-xs text-muted-foreground">สแกน QR Code ชำระเงิน</p>
                </div>
                {loading && <div className="ml-auto w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              </button>
            </div>
          </div>
        )}

        {/* Cash payment */}
        {mode === "cash" && (
          <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2">
            <button type="button" onClick={() => setMode("select")} className="text-sm text-primary mb-3">
              ← กลับ
            </button>
            <h3 className="font-semibold text-lg mb-1">รับเงินสด</h3>
            <p className="text-sm text-muted-foreground mb-4">ยอดชำระ <span className="font-bold text-foreground">฿{formatPrice(order.total)}</span></p>

            <div className="space-y-2 mb-4">
              <label htmlFor={cashInputId} className="text-sm font-medium">รับเงินมา (บาท)</label>
              <input
                id={cashInputId}
                type="number"
                inputMode="decimal"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border border-input text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[20, 50, 100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCashInput(String(amt))}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium bg-background active:bg-muted"
                >
                  ฿{amt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCashInput(String(Math.ceil(order.total)))}
                className="px-3 py-1.5 rounded-lg border border-primary/40 text-sm font-medium bg-primary/10 text-primary active:bg-primary/20"
              >
                พอดี
              </button>
            </div>

            {cashAmt >= order.total && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-emerald-700">เงินทอน <span className="font-bold text-lg">฿{formatPrice(change)}</span></p>
              </div>
            )}

            {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl mb-4">{error}</div>}

            <button
              type="button"
              disabled={cashAmt < order.total || loading}
              onClick={handleCashPay}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              {loading ? "กำลังบันทึก..." : "ยืนยันรับเงิน"}
            </button>
          </div>
        )}

        {/* PromptPay QR */}
        {mode === "promptpay" && qrData && (
          <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2 flex flex-col items-center">
            <h3 className="font-semibold text-lg mb-1 self-start">รอการชำระ</h3>
            <p className="text-sm text-muted-foreground mb-4 self-start">ให้ลูกค้าสแกน QR Code</p>

            <div className="bg-white rounded-3xl p-4 border-2 border-border shadow-sm mb-3">
              <Image
                src={qrData.qrCodeUrl}
                alt="PromptPay QR"
                width={220}
                height={220}
                className="rounded-xl"
                unoptimized
              />
            </div>

            <p className="text-xl font-bold mb-1">฿{formatPrice(qrData.amount)}</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-sm text-muted-foreground">รอยืนยันการชำระเงิน...</p>
            </div>

            {qrData.isMock && (
              <button
                type="button"
                onClick={handleMockConfirm}
                className="w-full py-3 rounded-2xl text-sm font-medium border-2 border-dashed border-amber-300 text-amber-700 bg-amber-50 active:bg-amber-100 mb-3"
              >
                [Dev] จำลองการชำระเงินสำเร็จ
              </button>
            )}

            <button type="button" onClick={onClose} className="text-sm text-muted-foreground">
              ยกเลิก
            </button>
          </div>
        )}

        {/* Success */}
        {mode === "success" && (
          <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl mb-4">
              ✓
            </div>
            <h3 className="text-xl font-bold text-emerald-700 mb-1">ชำระเงินสำเร็จ</h3>
            <p className="text-sm text-muted-foreground">กำลังไปหน้าใบเสร็จ...</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CashierPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);
  const router = useRouter();
  const { user, hydrated, logout } = useCashierAuth();

  // Data
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [screen, setScreen] = useState<Screen>("tables");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");

  const cancelledRef = useRef(false);
  const activeOrderRef = useRef<Order | null>(null);
  useEffect(() => { activeOrderRef.current = activeOrder; }, [activeOrder]);

  // Auth guard
  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
  }, [hydrated, user, router]);

  // Load initial data
  useEffect(() => {
    if (!hydrated || !user) return;
    cancelledRef.current = false;

    async function init() {
      try {
        const tenantId = user?.tenantId ?? "";
        const [t, cats, items] = await Promise.all([
          tableApi.list(branchId),
          menuApi.categories(tenantId),
          menuApi.items(tenantId),
        ]);
        if (cancelledRef.current) return;
        setTables(t);
        setCategories(cats);
        setMenuItems(items);
        if (cats.length > 0) setSelectedCategory(cats[0].id);
      } catch (err) {
        if (!cancelledRef.current) console.error("Cashier init failed:", err);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    }

    init();
    return () => { cancelledRef.current = true; };
  }, [branchId, hydrated, user]);

  const refreshTables = useCallback(async () => {
    try {
      const t = await tableApi.list(branchId);
      if (!cancelledRef.current) setTables(t);
    } catch { /* silent */ }
  }, [branchId]);

  const handleSelectTable = useCallback(async (table: Table) => {
    setSelectedTable(table);
    setActiveOrder(null);
    setScreen("order");

    if (table.activeOrder?.id) {
      try {
        const o = await orderApi.get(table.activeOrder.id);
        if (!cancelledRef.current) setActiveOrder(o);
      } catch {
        setActiveOrder(null);
      }
    }
  }, []);

  const handleAddItem = useCallback(
    async (item: MenuItem, qty: number, mods: SelectedModifiers, note: string) => {
      const table = selectedTable;
      if (!table || !user) return;
      setSelectedItem(null);

      const flatMods = Object.fromEntries(
        Object.entries(mods).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v]),
      ) as OrderItemModifiers;

      const newItems = [{ menuItemId: item.id, qty, modifiers: flatMods, note: note || undefined }];

      try {
        let o: Order;
        const current = activeOrderRef.current;
        if (current) {
          o = await orderApi.addItems(current.id, newItems);
        } else {
          o = await orderApi.create({ branchId, tableId: table.id, type: "DINE_IN", items: newItems });
        }
        if (cancelledRef.current) return;
        setActiveOrder(o);
        void refreshTables();
        setScreen("order");
      } catch (err) {
        alert(err instanceof Error ? err.message : "เพิ่มรายการไม่ได้");
      }
    },
    [branchId, user, selectedTable, refreshTables],
  );

  const handlePaid = useCallback(async (receiptToken: string | null) => {
    setShowPayment(false);
    if (receiptToken) {
      router.push(`/receipt/${receiptToken}`);
    } else {
      setActiveOrder(null);
      setSelectedTable(null);
      activeOrderRef.current = null;
      setScreen("tables");
      await refreshTables();
    }
  }, [refreshTables, router]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (!hydrated || !user) return null;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredItems = menuItems.filter((item) => {
    const matchCat = selectedCategory ? item.category.id === selectedCategory : true;
    const matchSearch = menuSearch
      ? item.name.toLowerCase().includes(menuSearch.toLowerCase())
      : true;
    return matchCat && matchSearch && item.isAvailable;
  });

  const activeItems = activeOrder?.items.filter((i) => i.status !== "VOIDED") ?? [];

  // ── Tables screen ────────────────────────────────────────────────────────

  if (screen === "tables") {
    const zones = [...new Set(tables.map((t) => t.zone ?? "ทั่วไป"))];

    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <header className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 bg-card border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">เลือกโต๊ะ</h1>
              <p className="text-xs text-muted-foreground">{user.name}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg border border-border"
            >
              ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Table grid */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {zones.map((zone) => (
            <section key={zone}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{zone}</p>
              <div className="grid grid-cols-3 gap-3">
                {tables
                  .filter((t) => (t.zone ?? "ทั่วไป") === zone)
                  .map((table) => {
                    const cfg = TABLE_STATUS_CONFIG[table.status] ?? TABLE_STATUS_CONFIG.AVAILABLE;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => handleSelectTable(table)}
                        className={cn(
                          "rounded-2xl border-2 p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform",
                          cfg.bg, cfg.border,
                        )}
                      >
                        <span className={cn("text-base font-bold", cfg.text)}>
                          {table.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                          <span className={cn("text-[10px]", cfg.text)}>{cfg.label}</span>
                        </div>
                        {table.activeOrder && (
                          <span className="text-[10px] text-muted-foreground">
                            ฿{formatPrice(table.activeOrder.total)}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>

        {/* Takeaway button */}
        <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 bg-card border-t border-border shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedTable(null);
              setActiveOrder(null);
              setScreen("order");
            }}
            className="w-full py-3.5 rounded-2xl border-2 border-dashed border-border font-semibold text-sm text-muted-foreground active:bg-muted"
          >
            🛍 สั่งกลับบ้าน (Takeaway)
          </button>
        </div>
      </div>
    );
  }

  // ── Order screen ─────────────────────────────────────────────────────────

  if (screen === "order") {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <header className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setScreen("tables");
                setSelectedTable(null);
                setActiveOrder(null);
              }}
              className="text-primary text-sm font-medium"
            >
              ← โต๊ะ
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-base">
                {selectedTable ? `โต๊ะ ${selectedTable.name}` : "สั่งกลับบ้าน"}
              </h1>
              {activeOrder && (
                <p className="text-xs text-muted-foreground">{activeItems.length} รายการ</p>
              )}
            </div>
          </div>
        </header>

        {/* Order items */}
        <div className="flex-1 overflow-y-auto">
          {activeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="text-5xl mb-4">🍽</div>
              <p className="font-semibold text-foreground mb-1">ยังไม่มีรายการ</p>
              <p className="text-sm text-muted-foreground">กดปุ่มด้านล่างเพื่อเพิ่มเมนู</p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-2">
              {activeItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 bg-card rounded-2xl px-4 py-3 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    {Object.keys(item.modifiers).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Object.values(item.modifiers).join(", ")}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-xs text-amber-600 mt-0.5">หมายเหตุ: {item.note}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">x{item.qty}</p>
                    <p className="text-sm font-semibold">฿{formatPrice(item.unitPrice * item.qty)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 bg-card border-t border-border shrink-0 space-y-3">
          {activeOrder && (
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-muted-foreground">ยอดรวม</span>
              <span className="text-xl font-bold text-primary">฿{formatPrice(activeOrder.total)}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setScreen("menu")}
              className="flex-1 py-3.5 rounded-2xl border-2 border-primary/40 bg-primary/5 text-primary font-semibold text-sm active:bg-primary/10"
            >
              + เพิ่มเมนู
            </button>
            {activeOrder && activeItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPayment(true)}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm active:opacity-80"
              >
                ชำระเงิน
              </button>
            )}
          </div>
        </div>

        {/* Modifier sheet */}
        <ModifierSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddItem}
        />

        {/* Payment sheet */}
        <PaymentSheet
          open={showPayment}
          order={activeOrder}
          onClose={() => setShowPayment(false)}
          onPaid={handlePaid}
        />
      </div>
    );
  }

  // ── Menu browser screen ───────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={() => setScreen("order")} className="text-primary text-sm font-medium">
            ← ออเดอร์
          </button>
          <h1 className="font-bold text-base flex-1">เพิ่มเมนู</h1>
        </div>
        <input
          type="text"
          value={menuSearch}
          onChange={(e) => setMenuSearch(e.target.value)}
          placeholder="ค้นหาเมนู..."
          className="w-full px-4 py-2.5 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </header>

      {/* Category tabs */}
      {!menuSearch && (
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-none border-b border-border shrink-0 bg-card">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-muted-foreground text-sm">ไม่พบเมนู</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.modifiers.length === 0) {
                    handleAddItem(item, 1, {}, "");
                  } else {
                    setSelectedItem(item);
                  }
                }}
                className="bg-card rounded-2xl border border-border overflow-hidden text-left active:scale-95 transition-transform"
              >
                {item.imageUrl && (
                  <div className="relative w-full aspect-square bg-muted">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 200px"
                    />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold leading-tight line-clamp-2">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                  <p className="text-sm font-bold text-primary mt-1">฿{formatPrice(item.price)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modifier sheet */}
      <ModifierSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAdd={handleAddItem}
      />
    </div>
  );
}
