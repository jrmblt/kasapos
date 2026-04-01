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
import { couponApi } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  PERCENT_DISCOUNT: "ลด %",
  FIXED_DISCOUNT: "ลดบาท",
  FREE_ITEM: "แถมเมนู",
};

const TARGET_LABEL: Record<string, string> = {
  PUBLIC: "ทุกคน",
  MEMBER_TIER: "เฉพาะ Tier",
  MEMBER_NEW: "สมาชิกใหม่",
  MEMBER_FIRST_ORDER: "ออเดอร์แรก",
  PHYSICAL_QR: "QR พิมพ์",
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDialog, setNewDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "PERCENT_DISCOUNT",
    targetType: "PUBLIC",
    value: "",
    minOrderAmt: "",
    maxDiscountAmt: "",
    usageLimit: "",
    usagePerMember: "1",
    startsAt: "",
    expiresAt: "",
  });

  const load = useCallback(async () => {
    try {
      const data = await couponApi.list();
      setCoupons(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(id: string, isActive: boolean) {
    await couponApi.toggle(id, !isActive);
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !isActive } : c)),
    );
  }

  async function handleCreate() {
    setSaving(true);
    setError("");
    try {
      await couponApi.create({
        code: form.code.toUpperCase(),
        name: form.name,
        type: form.type,
        targetType: form.targetType,
        value: Number(form.value),
        minOrderAmt: form.minOrderAmt ? Number(form.minOrderAmt) : null,
        maxDiscountAmt: form.maxDiscountAmt ? Number(form.maxDiscountAmt) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        usagePerMember: form.usagePerMember ? Number(form.usagePerMember) : null,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
      });
      await load();
      setNewDialog(false);
      resetForm();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm({
      code: "",
      name: "",
      type: "PERCENT_DISCOUNT",
      targetType: "PUBLIC",
      value: "",
      minOrderAmt: "",
      maxDiscountAmt: "",
      usageLimit: "",
      usagePerMember: "1",
      startsAt: "",
      expiresAt: "",
    });
    setError("");
  }

  function formatValue(c: any) {
    if (c.type === "PERCENT_DISCOUNT") {
      const cap = c.maxDiscountAmt ? ` (max ฿${Number(c.maxDiscountAmt)})` : "";
      return `${Number(c.value)}%${cap}`;
    }
    return `฿${Number(c.value)}`;
  }

  function isExpired(c: any) {
    return c.expiresAt && new Date(c.expiresAt) < new Date();
  }

  if (loading) return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">คูปอง</h1>
        <Button
          onClick={() => setNewDialog(true)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          + สร้างคูปอง
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">โค้ด</th>
              <th className="text-left px-4 py-3">ชื่อ</th>
              <th className="text-center px-4 py-3">ประเภท</th>
              <th className="text-center px-4 py-3">ส่วนลด</th>
              <th className="text-center px-4 py-3">กลุ่มเป้าหมาย</th>
              <th className="text-center px-4 py-3">ใช้แล้ว</th>
              <th className="text-center px-4 py-3">สถานะ</th>
              <th className="text-center px-4 py-3">เปิด/ปิด</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {coupons.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  ยังไม่มีคูปอง
                </td>
              </tr>
            )}
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <code className="font-mono font-bold text-violet-600">{c.code}</code>
                </td>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="secondary">{TYPE_LABEL[c.type] ?? c.type}</Badge>
                </td>
                <td className="px-4 py-3 text-center font-medium">{formatValue(c)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="outline">
                    {TARGET_LABEL[c.targetType] ?? c.targetType}
                    {c.tier?.name ? ` (${c.tier.name})` : ""}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  {c.usedCount}
                  {c.usageLimit != null && `/${c.usageLimit}`}
                </td>
                <td className="px-4 py-3 text-center">
                  {isExpired(c) ? (
                    <Badge variant="destructive">หมดอายุ</Badge>
                  ) : c.isActive ? (
                    <Badge className="bg-green-100 text-green-700">ใช้งานได้</Badge>
                  ) : (
                    <Badge variant="secondary">ปิดอยู่</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <Switch
                      checked={c.isActive}
                      onCheckedChange={() => handleToggle(c.id, c.isActive)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create dialog */}
      <Dialog
        open={newDialog}
        onOpenChange={(open) => {
          setNewDialog(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>สร้างคูปองใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="coupon-code" className="text-sm font-medium block mb-1">โค้ด *</label>
                <Input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="WELCOME10"
                  className="uppercase font-mono"
                />
              </div>
              <div>
                <label htmlFor="coupon-name" className="text-sm font-medium block mb-1">ชื่อคูปอง *</label>
                <Input
                  id="coupon-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="ลด 10% สมาชิกใหม่"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="coupon-type" className="text-sm font-medium block mb-1">ประเภท</label>
                <select
                  id="coupon-type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full h-10 border rounded-md px-3 text-sm bg-background"
                >
                  <option value="PERCENT_DISCOUNT">ลด %</option>
                  <option value="FIXED_DISCOUNT">ลดบาท</option>
                </select>
              </div>
              <div>
                <label htmlFor="coupon-value" className="text-sm font-medium block mb-1">
                  {form.type === "PERCENT_DISCOUNT" ? "เปอร์เซ็นต์ *" : "จำนวนเงิน (฿) *"}
                </label>
                <Input
                  id="coupon-value"
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "PERCENT_DISCOUNT" ? "10" : "50"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="coupon-target" className="text-sm font-medium block mb-1">กลุ่มเป้าหมาย</label>
                <select
                  id="coupon-target"
                  value={form.targetType}
                  onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))}
                  className="w-full h-10 border rounded-md px-3 text-sm bg-background"
                >
                  <option value="PUBLIC">ทุกคน</option>
                  <option value="MEMBER_NEW">สมาชิกใหม่</option>
                  <option value="MEMBER_FIRST_ORDER">ออเดอร์แรก</option>
                  <option value="MEMBER_TIER">เฉพาะ Tier</option>
                </select>
              </div>
              <div>
                <label htmlFor="coupon-min" className="text-sm font-medium block mb-1">ขั้นต่ำ (฿)</label>
                <Input
                  id="coupon-min"
                  type="number"
                  value={form.minOrderAmt}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderAmt: e.target.value }))}
                  placeholder="ไม่จำกัด"
                />
              </div>
            </div>

            {form.type === "PERCENT_DISCOUNT" && (
              <div>
                <label htmlFor="coupon-max" className="text-sm font-medium block mb-1">ลดสูงสุด (฿)</label>
                <Input
                  id="coupon-max"
                  type="number"
                  value={form.maxDiscountAmt}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmt: e.target.value }))}
                  placeholder="ไม่จำกัด"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="coupon-limit" className="text-sm font-medium block mb-1">ใช้ได้ทั้งหมด (ครั้ง)</label>
                <Input
                  id="coupon-limit"
                  type="number"
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="ไม่จำกัด"
                />
              </div>
              <div>
                <label htmlFor="coupon-per-member" className="text-sm font-medium block mb-1">ต่อสมาชิก (ครั้ง)</label>
                <Input
                  id="coupon-per-member"
                  type="number"
                  value={form.usagePerMember}
                  onChange={(e) => setForm((f) => ({ ...f, usagePerMember: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="coupon-start" className="text-sm font-medium block mb-1">เริ่ม</label>
                <Input
                  id="coupon-start"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="coupon-end" className="text-sm font-medium block mb-1">หมดอายุ</label>
                <Input
                  id="coupon-end"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setNewDialog(false); resetForm(); }}>
              ยกเลิก
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.code || !form.name || !form.value}>
              {saving ? "กำลังสร้าง..." : "สร้างคูปอง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
