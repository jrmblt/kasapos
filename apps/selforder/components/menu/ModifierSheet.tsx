"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
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
        className="p-0 rounded-t-3xl flex flex-col"
        style={{ maxHeight: "90dvh" }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <SheetHeader className="px-5 pb-3 shrink-0 border-b">
          <SheetTitle className="text-left text-lg leading-snug">
            {item.name}
          </SheetTitle>
          {item.description && (
            <p className="text-sm text-muted-foreground text-left">
              {item.description}
            </p>
          )}
          <p className="text-primary font-semibold text-sm">
            ฿{item.price}
            {modifierExtra > 0 && (
              <span className="text-muted-foreground font-normal">
                {" "}
                +฿{modifierExtra} (option)
              </span>
            )}
          </p>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 min-h-0">
          {item.modifiers.map((mod) => (
            <div key={mod.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-sm">{mod.name}</span>
                {mod.isRequired ? (
                  <Badge
                    variant="destructive"
                    className="text-xs px-1.5 py-0 h-4"
                  >
                    จำเป็น
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">(ไม่บังคับ)</span>
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
                        "text-left px-3 py-3 rounded-2xl border-2 text-sm transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 font-semibold"
                          : "border-border/60 hover:border-primary/30 bg-card",
                      )}
                    >
                      <p className="leading-snug">{opt.name}</p>
                      {opt.priceAdd > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          +฿{opt.priceAdd}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Note */}
          <div>
            <p className="text-sm font-semibold mb-2">
              หมายเหตุ{" "}
              <span className="font-normal text-muted-foreground">
                (ไม่บังคับ)
              </span>
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่ใส่ผัก, ไม่เผ็ด"
              className="w-full px-4 py-3 rounded-2xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/5 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Fixed footer */}
        <div className="shrink-0 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] border-t bg-background">
          {/* Qty + Add button */}
          <div className="flex items-center gap-3">
            {/* qty */}
            <div className="flex items-center gap-2 bg-muted rounded-2xl px-3 py-2">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors text-lg font-medium"
              >
                −
              </button>
              <span className="text-base font-bold w-6 text-center">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors text-lg font-medium"
              >
                +
              </button>
            </div>

            <Button
              onClick={handleAdd}
              className="flex-1 h-12 text-sm font-bold rounded-2xl"
            >
              เพิ่มลงตะกร้า &nbsp;·&nbsp; ฿{totalPrice.toFixed(0)}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
