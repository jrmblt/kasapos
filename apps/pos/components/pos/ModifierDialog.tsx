"use client";
import { useEffect, useState } from "react";
import type { MenuItem, ModifierOption } from "@/app/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface SelectedModifiers {
  [modifierName: string]: string; // name → selected option name
}

interface Props {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (
    item: MenuItem,
    qty: number,
    modifiers: SelectedModifiers,
    note: string,
  ) => void;
}

export function ModifierDialog({ item, onClose, onAdd }: Props) {
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<SelectedModifiers>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // reset เมื่อ item เปลี่ยน
  useEffect(() => {
    if (item) {
      setQty(1);
      setSelected({});
      setNote("");
      setError("");
    }
  }, [item?.id]);

  if (!item) return null;

  const modifierExtra = Object.entries(selected).reduce(
    (sum, [modName, optName]) => {
      const mod = item.modifiers.find((m) => m.name === modName);
      const opt = mod?.options.find((o: ModifierOption) => o.name === optName);
      return sum + (opt?.priceAdd ?? 0);
    },
    0,
  );

  const unitPrice = Number(item.price) + modifierExtra;
  const totalPrice = unitPrice * qty;

  function selectOption(modName: string, optName: string) {
    setSelected((prev) => ({ ...prev, [modName]: optName }));
    setError("");
  }

  function handleAdd() {
    const missing = item.modifiers
      .filter((m) => m.isRequired && !selected[m.name])
      .map((m) => m.name);

    if (missing.length > 0) {
      setError(`กรุณาเลือก: ${missing.join(", ")}`);
      return;
    }

    onAdd(item, qty, selected, note);
  }

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{item.name}</DialogTitle>
          {item.description && (
            <p className="text-sm text-zinc-400">{item.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-5">
          {/* Modifiers */}
          {item.modifiers.map((mod) => (
            <div key={mod.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-zinc-200">
                  {mod.name}
                </span>
                {mod.isRequired && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    จำเป็น
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {mod.options.map((opt: ModifierOption) => {
                  const isSelected = selected[mod.name] === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => selectOption(mod.name, opt.name)}
                      className={cn(
                        "text-left px-3 py-2 rounded-lg border text-sm transition-all",
                        isSelected
                          ? "border-violet-500 bg-violet-950 text-violet-200"
                          : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500",
                      )}
                    >
                      <span>{opt.name}</span>
                      {opt.priceAdd > 0 && (
                        <span className="text-zinc-500 ml-1">
                          +฿{opt.priceAdd}
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
            <label
              htmlFor="note"
              className="text-sm font-medium text-zinc-300 block mb-1.5"
            >
              หมายเหตุ
              <span className="text-zinc-500 font-normal ml-1">(ไม่บังคับ)</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่ใส่ผัก"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <DialogFooter className="flex-col gap-3">
          {/* Qty control */}
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full border border-zinc-600 flex items-center justify-center text-white hover:bg-zinc-700 text-lg font-medium"
            >
              −
            </button>
            <span className="text-xl font-semibold text-white w-8 text-center">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="w-9 h-9 rounded-full border border-zinc-600 flex items-center justify-center text-white hover:bg-zinc-700 text-lg font-medium"
            >
              +
            </button>
          </div>

          <Button
            onClick={handleAdd}
            className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-base font-semibold rounded-xl"
          >
            เพิ่ม {qty} รายการ — ฿{totalPrice.toFixed(0)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
