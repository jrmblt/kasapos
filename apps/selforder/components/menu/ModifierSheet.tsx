"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (
    item: MenuItem,
    qty: number,
    modifiers: Record<string, string>,
    note: string,
  ) => void;
}

export function ModifierSheet({ item, onClose, onAdd }: Props) {
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!item) return null;

  // คำนวณราคารวม modifier
  const modifierExtra = Object.entries(selected).reduce(
    (sum, [modName, optName]) => {
      const mod = item.modifiers.find((m) => m.name === modName);
      const opt = mod?.options.find((o) => o.name === optName);
      return sum + (opt?.priceAdd ?? 0);
    },
    0,
  );
  const totalPrice = (item.price + modifierExtra) * qty;

  function select(modName: string, optName: string) {
    setSelected((prev) => ({ ...prev, [modName]: optName }));
    setError("");
  }

  function handleAdd() {
    // เช็ค required modifiers
    if (!item) return;
    const missing = item.modifiers
      .filter((m) => m.isRequired && !selected[m.name])
      .map((m) => m.name);

    if (missing.length > 0) {
      setError(`กรุณาเลือก: ${missing.join(", ")}`);
      return;
    }

    onAdd(item, qty, selected, note);
    setQty(1);
    setSelected({});
    setNote("");
    onClose();
  }

  return (
    <Sheet open={!!item} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-2xl"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left text-lg">{item.name}</SheetTitle>
          {item.description && (
            <p className="text-sm text-muted-foreground text-left">
              {item.description}
            </p>
          )}
        </SheetHeader>

        <div className="space-y-6 py-4">
          {item.modifiers.map((mod) => (
            <div key={mod.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-medium text-sm">{mod.name}</span>
                {mod.isRequired && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    จำเป็น
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {mod.options.map((opt) => {
                  const isSelected = selected[mod.name] === opt.name;
                  return (
                    <button
                      type="button"
                      key={opt.name}
                      onClick={() => select(mod.name, opt.name)}
                      className={cn(
                        "text-left px-3 py-2.5 rounded-xl border text-sm transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span>{opt.name}</span>
                      {opt.priceAdd > 0 && (
                        <span className="text-muted-foreground ml-1">
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
            <span className="text-sm font-medium block mb-2">
              หมายเหตุ (ไม่บังคับ)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่ใส่ผัก, ไม่เผ็ด"
              className="w-full px-3 py-2.5 rounded-xl border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter className="gap-3 flex-col sm:flex-row">
          {/* qty control */}
          <div className="flex items-center justify-center gap-4 w-full">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full border flex items-center justify-center text-lg font-medium hover:bg-accent"
            >
              −
            </button>
            <span className="text-xl font-semibold w-8 text-center">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="w-10 h-10 rounded-full border flex items-center justify-center text-lg font-medium hover:bg-accent"
            >
              +
            </button>
          </div>
          <Button
            onClick={handleAdd}
            className="w-full h-12 text-base rounded-xl"
          >
            เพิ่มลงตะกร้า — ฿{totalPrice.toFixed(0)}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
