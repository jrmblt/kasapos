"use client";
import QRCode from "qrcode";
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
import { useAuth } from "@/hooks/useAuth";
import { tableApi } from "@/lib/api";

const APP_URL =
  process.env.NEXT_PUBLIC_SELF_ORDER_URL ?? "http://localhost:3001";

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "ว่าง",
  OCCUPIED: "มีลูกค้า",
  RESERVED: "จอง",
  CLEANING: "ทำความสะอาด",
};
const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "secondary",
  OCCUPIED: "default",
  RESERVED: "outline",
  CLEANING: "secondary",
};

export default function TablesPage() {
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDialog, setNewDialog] = useState(false);
  const [qrDialog, setQrDialog] = useState<any | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [form, setForm] = useState({ name: "", zone: "", capacity: "4" });
  const [saving, setSaving] = useState(false);

  const branchId = user?.branchId ?? "branch-silom";

  const load = useCallback(async () => {
    try {
      const t = await tableApi.list(branchId);
      setTables(t);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!qrDialog?.qrToken) return;
    QRCode.toDataURL(`${APP_URL}/${qrDialog.qrToken}`, {
      width: 250,
      margin: 2,
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [qrDialog]);

  async function handleCreate() {
    setSaving(true);
    try {
      await tableApi.create(branchId, {
        name: form.name,
        zone: form.zone || undefined,
        capacity: Number(form.capacity),
      });
      await load();
      setNewDialog(false);
      setForm({ name: "", zone: "", capacity: "4" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenQr(table: any) {
    await tableApi.regenerateQr(table.id);
    await load();
  }

  const zones = [...new Set(tables.map((t) => t.zone ?? "ทั่วไป"))];

  if (loading)
    return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">โต๊ะ & QR Code</h1>
        <Button
          onClick={() => setNewDialog(true)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          + เพิ่มโต๊ะ
        </Button>
      </div>

      {zones.map((zone) => (
        <div key={zone}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            {zone}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tables
              .filter((t) => (t.zone ?? "ทั่วไป") === zone)
              .map((table) => (
                <div
                  key={table.id}
                  className="border rounded-xl p-4 space-y-3 bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-lg">{table.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {table.capacity} ที่นั่ง
                      </p>
                    </div>
                    <Badge variant={STATUS_COLOR[table.status] as any}>
                      {STATUS_LABEL[table.status] ?? table.status}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => setQrDialog(table)}
                    >
                      ดู QR
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      onClick={() => handleRegenQr(table)}
                    >
                      ↻
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* Create dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มโต๊ะใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label htmlFor="name" className="text-sm font-medium block mb-1">
                ชื่อโต๊ะ *
              </label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="เช่น A5, VIP 3"
              />
            </div>
            <div>
              <label htmlFor="zone" className="text-sm font-medium block mb-1">
                โซน
              </label>
              <Input
                value={form.zone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, zone: e.target.value }))
                }
                placeholder="Indoor, Outdoor, VIP..."
              />
            </div>
            <div>
              <label
                htmlFor="capacity"
                className="text-sm font-medium block mb-1"
              >
                จำนวนที่นั่ง
              </label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewDialog(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.name}>
              {saving ? "กำลังสร้าง..." : "สร้างโต๊ะ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      <Dialog
        open={!!qrDialog}
        onOpenChange={() => {
          setQrDialog(null);
          setQrDataUrl("");
        }}
      >
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>QR — โต๊ะ {qrDialog?.name}</DialogTitle>
          </DialogHeader>
          {qrDataUrl ? (
            <div className="space-y-3">
              <img src={qrDataUrl} alt="QR" className="mx-auto rounded-lg" />
              <p className="text-xs text-muted-foreground break-all">
                {APP_URL}/{qrDialog?.qrToken}
              </p>
              <a
                href={qrDataUrl}
                download={`qr-table-${qrDialog?.name}.png`}
                className="block"
              >
                <Button variant="outline" className="w-full">
                  ดาวน์โหลด QR
                </Button>
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">กำลังสร้าง QR...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
