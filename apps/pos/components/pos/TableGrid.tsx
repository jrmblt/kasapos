"use client";
import type { Table } from "@/app/lib/types";
import { cn } from "@/lib/utils";

interface TableStatusConfig {
  label: string;
  bg: string;
  border: string;
  text: string;
}

const STATUS_CONFIG: Record<string, TableStatusConfig> = {
  AVAILABLE: {
    label: "ว่าง",
    bg: "bg-zinc-800",
    border: "border-zinc-700",
    text: "text-zinc-300",
  },
  OCCUPIED: {
    label: "มีลูกค้า",
    bg: "bg-violet-950",
    border: "border-violet-700",
    text: "text-violet-200",
  },
  RESERVED: {
    label: "จอง",
    bg: "bg-amber-950",
    border: "border-amber-700",
    text: "text-amber-200",
  },
  CLEANING: {
    label: "ทำความสะอาด",
    bg: "bg-zinc-900",
    border: "border-zinc-600",
    text: "text-zinc-500",
  },
};

interface Props {
  tables: Table[];
  selectedTableId: string | null;
  onSelect: (table: Table) => void;
}

export function TableGrid({ tables, selectedTableId, onSelect }: Props) {
  const zones = [...new Set(tables.map((t) => t.zone ?? "ทั่วไป"))];

  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
        ไม่มีโต๊ะ
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {zones.map((zone) => {
        const zoneTable = tables.filter((t) => (t.zone ?? "ทั่วไป") === zone);
        return (
          <div key={zone}>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">
              {zone}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {zoneTable.map((table) => {
                const cfg =
                  STATUS_CONFIG[table.status] ?? STATUS_CONFIG.AVAILABLE;
                const isSelected = table.id === selectedTableId;

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => onSelect(table)}
                    className={cn(
                      "relative p-3 rounded-xl border text-left transition-all duration-150",
                      cfg.bg,
                      cfg.border,
                      cfg.text,
                      isSelected &&
                        "ring-2 ring-violet-400 ring-offset-2 ring-offset-zinc-950",
                    )}
                  >
                    <p className="font-bold text-lg leading-none">
                      {table.name}
                    </p>
                    <p className="text-xs mt-1 opacity-70">{cfg.label}</p>
                    {table.activeOrder && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-xs font-medium">
                          ฿{Number(table.activeOrder.total).toFixed(0)}
                        </p>
                        <p className="text-xs opacity-60">
                          {table.activeOrder.itemCount} รายการ
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
