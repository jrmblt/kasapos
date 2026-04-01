"use client";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { menuApi } from "@/lib/api";

export default function MenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<any | null>(null);
  const [newItem, setNewItem] = useState(false);
  const [stockItem, setStockItem] = useState<any | null>(null);
  const [stockDelta, setStockDelta] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [it, cats] = await Promise.all([
        menuApi.items(),
        menuApi.categories(),
      ]);
      setItems(it);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAvailable(item: any) {
    await menuApi.update(item.id, { isAvailable: !item.isAvailable });
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i,
      ),
    );
  }

  async function handleSave(data: any) {
    setSaving(true);
    setError("");
    try {
      if (editItem) {
        await menuApi.update(editItem.id, data);
      } else {
        await menuApi.create(data);
      }
      await load();
      setEditItem(null);
      setNewItem(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStockAdjust() {
    if (!stockItem || !stockDelta) return;
    setSaving(true);
    try {
      await menuApi.adjustStock(stockItem.id, { delta: Number(stockDelta) });
      await load();
      setStockItem(null);
      setStockDelta("");
    } finally {
      setSaving(false);
    }
  }

  const filtered = items.filter(
    (i) => !search || i.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return <p className="text-muted-foreground text-sm">กำลังโหลด...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">จัดการเมนู</h1>
        <Button
          onClick={() => setNewItem(true)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          + เพิ่มเมนูใหม่
        </Button>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="ค้นหาเมนู..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Category tabs */}
      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">ทั้งหมด ({items.length})</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <MenuTable
            items={filtered}
            onToggle={toggleAvailable}
            onEdit={setEditItem}
            onStock={setStockItem}
          />
        </TabsContent>
        {categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-4">
            <MenuTable
              items={filtered.filter((i) => i.category?.id === cat.id)}
              onToggle={toggleAvailable}
              onEdit={setEditItem}
              onStock={setStockItem}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit / Create dialog */}
      <MenuFormDialog
        open={!!editItem || newItem}
        item={editItem}
        categories={categories}
        saving={saving}
        error={error}
        onSave={handleSave}
        onClose={() => {
          setEditItem(null);
          setNewItem(false);
          setError("");
        }}
      />

      {/* Stock dialog */}
      <Dialog open={!!stockItem} onOpenChange={() => setStockItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปรับ Stock — {stockItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Stock ปัจจุบัน:{" "}
              <strong>{stockItem?.stockQty ?? "ไม่ได้ track"}</strong>
            </p>
            <Input
              type="number"
              placeholder="จำนวนที่เพิ่ม/ลด (ใส่ลบได้)"
              value={stockDelta}
              onChange={(e) => setStockDelta(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              เช่น +10 = เพิ่ม 10, -3 = ลด 3
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStockItem(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleStockAdjust}
              disabled={saving || !stockDelta}
            >
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function MenuTable({ items, onToggle, onEdit, onStock }: any) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">ไม่พบเมนู</p>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">ชื่อ</th>
            <th className="text-right px-4 py-3">ราคา</th>
            <th className="text-center px-4 py-3">Stock</th>
            <th className="text-center px-4 py-3">สถานะ</th>
            <th className="text-center px-4 py-3">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item: any) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {item.tags?.map((t: string) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-medium">
                ฿{Number(item.price).toFixed(0)}
              </td>
              <td className="px-4 py-3 text-center">
                {item.stockQty === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <button type="button" onClick={() => onStock(item)}>
                    <Badge
                      variant={
                        item.stockQty <= (item.stockAlert ?? 5)
                          ? "destructive"
                          : "secondary"
                      }
                      className="cursor-pointer"
                    >
                      {item.stockQty}
                    </Badge>
                  </button>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-center">
                  <Switch
                    checked={item.isAvailable}
                    onCheckedChange={() => onToggle(item)}
                  />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="text-xs text-violet-600 hover:underline"
                  >
                    แก้ไข
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MenuFormDialog({
  open,
  item,
  categories,
  saving,
  error,
  onSave,
  onClose,
}: any) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    categoryId: "",
    stockQty: "",
    stockAlert: "5",
    description: "",
    tags: "",
    isAvailable: true,
  });

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name ?? "",
        price: String(item.price ?? ""),
        categoryId: item.category?.id ?? "",
        stockQty: item.stockQty !== null ? String(item.stockQty) : "",
        stockAlert: String(item.stockAlert ?? 5),
        description: item.description ?? "",
        tags: item.tags?.join(", ") ?? "",
        isAvailable: item.isAvailable ?? true,
      });
    } else {
      setForm({
        name: "",
        price: "",
        categoryId: "",
        stockQty: "",
        stockAlert: "5",
        description: "",
        tags: "",
        isAvailable: true,
      });
    }
  }, [item, open]);

  function handleSubmit() {
    onSave({
      name: form.name,
      price: Number(form.price),
      categoryId: form.categoryId,
      stockQty: form.stockQty !== "" ? Number(form.stockQty) : null,
      stockAlert: Number(form.stockAlert),
      description: form.description || null,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      isAvailable: form.isAvailable,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label htmlFor="name" className="text-sm font-medium block mb-1">
              ชื่อเมนู *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="price" className="text-sm font-medium block mb-1">
                ราคา (บาท) *
              </label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                htmlFor="categoryId"
                className="text-sm font-medium block mb-1"
              >
                หมวดหมู่ *
              </label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoryId: e.target.value }))
                }
                className="w-full h-10 border rounded-md px-3 text-sm bg-background"
              >
                <option value="">เลือก...</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="stockQty"
                className="text-sm font-medium block mb-1"
              >
                Stock (ว่าง = ไม่ track)
              </label>
              <Input
                type="number"
                value={form.stockQty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stockQty: e.target.value }))
                }
                placeholder="ไม่จำกัด"
              />
            </div>
            <div>
              <label
                htmlFor="stockAlert"
                className="text-sm font-medium block mb-1"
              >
                แจ้งเตือนเมื่อเหลือ
              </label>
              <Input
                type="number"
                value={form.stockAlert}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stockAlert: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label htmlFor="tags" className="text-sm font-medium block mb-1">
              Tags (คั่นด้วย ,)
            </label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="bestseller, spicy, vegan"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isAvailable}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, isAvailable: v }))
              }
            />
            <label htmlFor="isAvailable" className="text-sm">
              เปิดขาย
            </label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.price || !form.categoryId}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
