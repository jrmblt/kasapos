"use client";
import { useMemo, useState } from "react";
import type { Category, MenuItem } from "@/app/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  categories: Category[];
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
}

export function MenuPanel({ categories, items, onSelect }: Props) {
  const [activeCatId, setActiveCatId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!item.isAvailable) return false;
      if (activeCatId !== "all" && item.category.id !== activeCatId)
        return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [items, activeCatId, search]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="px-3 py-2 border-b border-zinc-800 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาเมนู..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0 border-b border-zinc-800 scrollbar-none">
        {[{ id: "all", name: "ทั้งหมด", sortOrder: -1 }, ...categories].map(
          (cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCatId(cat.id)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                activeCatId === cat.id
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700",
              )}
            >
              {cat.name}
            </button>
          ),
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
            ไม่พบเมนู
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className="text-left p-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:border-violet-500 hover:bg-zinc-750 active:scale-95 transition-all duration-100"
              >
                <p className="font-medium text-sm text-white line-clamp-2 leading-tight">
                  {item.name}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-violet-400 font-semibold text-sm">
                    ฿{Number(item.price).toFixed(0)}
                  </p>
                  {item.stockQty !== null && (
                    <Badge
                      variant={item.stockQty <= 5 ? "destructive" : "secondary"}
                      className="text-xs px-1.5 py-0"
                    >
                      {item.stockQty}
                    </Badge>
                  )}
                </div>
                {item.tags.includes("bestseller") && (
                  <p className="text-xs text-amber-400 mt-1">⭐ ขายดี</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
