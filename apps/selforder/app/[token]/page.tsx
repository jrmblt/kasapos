"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { ModifierSheet } from "@/components/menu/ModifierSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useMember } from "@/hooks/useMember";
import { menuApi, tableApi } from "@/lib/api";
import type { BranchConfig, MenuCategory, MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MenuPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const cart = useCart();
  const { account, hydrate } = useMember();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activecat, setActiveCat] = useState<string>("all");
  const [branch, setBranch] = useState<BranchConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelected] = useState<MenuItem | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function init() {
      try {
        const table = await tableApi.getByToken(token);
        console.log("table", table);
        setBranch(table.branch);
        localStorage.setItem("pos-branch-config", JSON.stringify(table.branch));
        cart.setContext({
          tableId: table.id,
          branchId: table.branchId,
          tenantId: table.branch.tenantId,
        });
        const [cats, menuItems] = await Promise.all([
          menuApi.categories(table.branch.tenantId),
          menuApi.list(table.branch.tenantId),
        ]);
        setCategories(cats);
        setItems(menuItems);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token, cart.setContext]);

  const filtered =
    activecat === "all"
      ? items.filter((i) => i.isAvailable)
      : items.filter((i) => i.isAvailable && i.category.id === activecat);

  function handleAddToCart(
    item: MenuItem,
    qty: number,
    modifiers: Record<string, string>,
    note: string,
  ) {
    cart.addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      qty,
      modifiers,
      note,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground text-sm">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-3">
          <h1 className="font-semibold text-base">{branch?.name ?? "เมนู"}</h1>
          {account && (
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0"
                style={{
                  borderColor: account.tier?.color,
                  color: account.tier?.color,
                }}
              >
                {account.tier?.name ?? "Member"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {account.name ?? account.phone} · {account.points} แต้ม
              </span>
            </div>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCat("all")}
            className={cn(
              "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              activecat === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={cn(
                "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                activecat === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {filtered.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setSelected(item)}
            className="text-left bg-card border rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
          >
            {item.imageUrl ? (
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                <span className="text-3xl">🍽️</span>
              </div>
            )}
            <div className="p-3">
              <div className="flex gap-1 flex-wrap mb-1">
                {item.tags.includes("bestseller") && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    ขายดี
                  </Badge>
                )}
                {item.stockQty !== null &&
                  item.stockQty !== undefined &&
                  item.stockQty <= 5 && (
                    <Badge
                      variant="destructive"
                      className="text-xs px-1.5 py-0"
                    >
                      เหลือ {item.stockQty}
                    </Badge>
                  )}
              </div>
              <p className="font-medium text-sm line-clamp-2 leading-tight">
                {item.name}
              </p>
              <p className="text-primary font-semibold text-sm mt-1">
                ฿{item.price}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Modifier Sheet */}
      <ModifierSheet
        item={selectedItem}
        onClose={() => setSelected(null)}
        onAdd={handleAddToCart}
      />

      {/* Cart FAB */}
      {cart.itemCount() > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-30">
          <Button
            onClick={() => router.push(`/${token}/checkout`)}
            className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg"
          >
            <div className="flex items-center justify-between w-full px-2">
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-0"
              >
                {cart.itemCount()} รายการ
              </Badge>
              <span>ดูตะกร้า</span>
              <span>฿{cart.total().toFixed(0)}</span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
