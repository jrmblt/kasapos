"use client";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { menuApi, orderApi, tableApi } from "@/app/lib/api";
import type {
  Category,
  MenuItem,
  Order,
  OrderItemModifiers,
  Table,
} from "@/app/lib/types";
import { CartPanel } from "@/components/pos/CartPanel";
import { MenuPanel } from "@/components/pos/MenuPanel";
import type { SelectedModifiers } from "@/components/pos/ModifierDialog";
import { ModifierDialog } from "@/components/pos/ModifierDialog";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { TableGrid } from "@/components/pos/TableGrid";
import { usePosAuth } from "@/hooks/usePosAuth";

export default function PosPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);
  const router = useRouter();
  const { user, hydrated, logout } = usePosAuth();

  // ── Data state ───────────────────────────────────────────
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI state ─────────────────────────────────────────────
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  // ── Refs (avoid stale closure without deps) ──────────────
  const activeOrderRef = useRef<Order | null>(null);
  const selectedTableRef = useRef<Table | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    activeOrderRef.current = activeOrder;
  }, [activeOrder]);
  useEffect(() => {
    selectedTableRef.current = selectedTable;
  }, [selectedTable]);

  // ── Auth guard — รอ hydrate ───────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  // ── Load initial data ─────────────────────────────────────
  useEffect(() => {
    if (!hydrated || !user) return;

    const tenantId = user.tenantId;
    cancelledRef.current = false;

    async function init() {
      try {
        const [t, cats, items] = await Promise.all([
          tableApi.list(branchId),
          menuApi.categories(tenantId),
          menuApi.items(tenantId),
        ]);
        if (cancelledRef.current) return;
        setTables(t);
        setCategories(cats);
        setMenuItems(items);
      } catch (err) {
        if (!cancelledRef.current) {
          console.error("POS init failed:", err);
        }
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    }

    init();

    return () => {
      cancelledRef.current = true;
    };
  }, [branchId, hydrated, user]);

  // ── Refresh helpers (stable refs → no stale closure) ─────
  const refreshTables = useCallback(async () => {
    if (cancelledRef.current) return;
    try {
      const t = await tableApi.list(branchId);
      if (!cancelledRef.current) setTables(t);
    } catch {
      /* silent */
    }
  }, [branchId]);

  const refreshOrder = useCallback(async () => {
    const id = activeOrderRef.current?.id;
    if (!id || cancelledRef.current) return;
    try {
      const o = await orderApi.get(id);
      if (!cancelledRef.current) setActiveOrder(o);
    } catch {
      /* silent */
    }
  }, []);

  // ── Select table ──────────────────────────────────────────
  const handleSelectTable = useCallback(async (table: Table) => {
    setSelectedTable(table);
    setShowMenu(false);
    setActiveOrder(null);

    if (table.activeOrder?.id) {
      try {
        const o = await orderApi.get(table.activeOrder.id);
        if (!cancelledRef.current) setActiveOrder(o);
      } catch {
        setActiveOrder(null);
      }
    }
  }, []);

  // ── Add item to order (กด confirm ใน ModifierDialog) ──────
  const handleConfirmItem = useCallback(
    async (
      item: MenuItem,
      qty: number,
      modifiers: SelectedModifiers,
      note: string,
    ) => {
      const table = selectedTableRef.current;
      if (!table || !user) return;

      setSelectedItem(null);

      const currentOrder = activeOrderRef.current;

      try {
        const o = await orderApi.create({
          branchId,
          tableId: table.id,
          sessionId: currentOrder?.sessionId ?? undefined,
          type: "DINE_IN",
          items: [
            {
              menuItemId: item.id,
              qty,
              modifiers: modifiers as OrderItemModifiers,
              note: note || undefined,
            },
          ],
        });

        if (cancelledRef.current) return;

        if (!currentOrder) {
          // order ใหม่
          setActiveOrder(o);
        } else {
          // refresh order ที่มีอยู่
          await refreshOrder();
        }

        // refresh table status แบบ lazy
        void refreshTables();
        setShowMenu(false);
      } catch (err) {
        console.error("Create order error:", err);
        alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    },
    [branchId, user, refreshOrder, refreshTables],
  );

  // ── Void item ─────────────────────────────────────────────
  const handleVoidItem = useCallback(
    async (itemId: string, reason: string, pin: string) => {
      const order = activeOrderRef.current;
      if (!order) return;
      await orderApi.voidItem(order.id, itemId, { voidReason: reason, pin });
      await refreshOrder();
    },
    [refreshOrder],
  );

  // ── After payment ─────────────────────────────────────────
  const handlePaid = useCallback(async () => {
    setShowPayment(false);
    setActiveOrder(null);
    setSelectedTable(null);
    activeOrderRef.current = null;
    selectedTableRef.current = null;
    await refreshTables();
  }, [refreshTables]);

  // ── Memoised menu item lookup ─────────────────────────────
  const handleSelectMenuItem = useCallback(
    (item: MenuItem) => {
      // ถ้าไม่มี modifier → เพิ่มเลย ไม่ต้อง dialog
      if (item.modifiers.length === 0) {
        handleConfirmItem(item, 1, {}, "");
      } else {
        setSelectedItem(item);
      }
    },
    [handleConfirmItem],
  );

  // ─────────────────────────────────────────────────────────
  if (!hydrated || !user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* ── Topbar ─────────────────────────────────────────── */}
      <header className="h-12 flex items-center justify-between px-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-violet-400">Kasa POS</span>
          <span className="text-zinc-700">|</span>
          <span className="text-sm text-zinc-300">{user.name}</span>
          {selectedTable && (
            <>
              <span className="text-zinc-700">|</span>
              <span className="text-sm text-violet-300">
                โต๊ะ {selectedTable.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => router.push(`/${branchId}/shift`)}
            className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            กะการทำงาน
          </button>
          <button
            type="button"
            onClick={logout}
            className="text-xs text-zinc-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Table list */}
        <aside
          className={[
            "flex flex-col border-r border-zinc-800 transition-all duration-200",
            showMenu ? "w-0 overflow-hidden" : "w-60 xl:w-72",
          ].join(" ")}
        >
          <div className="px-3 py-2 border-b border-zinc-800 shrink-0">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              โต๊ะทั้งหมด
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <TableGrid
              tables={tables}
              selectedTableId={selectedTable?.id ?? null}
              onSelect={handleSelectTable}
            />
          </div>
        </aside>

        {/* Center: Menu panel (toggle) */}
        {showMenu && (
          <div className="flex-1 flex flex-col border-r border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <p className="text-sm font-medium text-white">
                เพิ่มรายการ
                {selectedTable && ` — โต๊ะ ${selectedTable.name}`}
              </p>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="text-zinc-500 hover:text-white text-sm px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
              >
                ✕ ปิด
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MenuPanel
                categories={categories}
                items={menuItems}
                onSelect={handleSelectMenuItem}
              />
            </div>
          </div>
        )}

        {/* Right: Cart / Order panel */}
        <aside className="w-72 xl:w-80 shrink-0 flex flex-col border-l border-zinc-800 overflow-hidden">
          <CartPanel
            order={activeOrder}
            tableName={selectedTable?.name ?? ""}
            onAddMore={() => {
              if (selectedTable) setShowMenu(true);
            }}
            onPayment={() => setShowPayment(true)}
            onVoidItem={handleVoidItem}
            onRefresh={refreshOrder}
          />
        </aside>
      </div>

      {/* ── Modifier dialog ────────────────────────────────── */}
      <ModifierDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAdd={handleConfirmItem}
      />

      {/* ── Payment dialog ─────────────────────────────────── */}
      <PaymentDialog
        open={showPayment}
        order={activeOrder}
        onClose={() => setShowPayment(false)}
        onPaid={handlePaid}
      />
    </div>
  );
}
