"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { branchApi } from "@/lib/api";

interface ToggleItem {
  key: string;
  label: string;
  desc: string;
  section: string;
}

const SETTINGS: ToggleItem[] = [
  {
    key: "selfOrderEnabled",
    label: "Self-order (QR สั่งเอง)",
    desc: "ลูกค้าสแกน QR โต๊ะแล้วสั่งอาหารเองได้",
    section: "Self-order",
  },
  {
    key: "payOnlineEnabled",
    label: "จ่ายออนไลน์ (PromptPay)",
    desc: "ลูกค้าจ่ายผ่าน QR PromptPay ได้เลย",
    section: "Self-order",
  },
  {
    key: "payAtCounterEnabled",
    label: "จ่ายที่เคาน์เตอร์",
    desc: "สั่งแล้วไปจ่ายที่แคชเชียร์",
    section: "Self-order",
  },
  {
    key: "payLaterEnabled",
    label: "Pay Later",
    desc: "สั่งก่อน จ่ายทีหลัง (staff เก็บเงิน)",
    section: "Self-order",
  },
  {
    key: "queueEnabled",
    label: "ระบบคิว",
    desc: "ออกเลขคิวหลังชำระเงิน",
    section: "Queue",
  },
  {
    key: "queueDisplayName",
    label: "เรียกชื่อแทนเลขคิว",
    desc: "ใช้ชื่อลูกค้าแทนเลขคิวตอนเรียก",
    section: "Queue",
  },
  {
    key: "loyaltyEnabled",
    label: "ระบบสะสมแต้ม",
    desc: "เปิดใช้ loyalty point สำหรับสาขานี้",
    section: "Loyalty",
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const branchId = user?.branchId ?? "branch-silom";

  useEffect(() => {
    branchApi
      .settings(branchId)
      .then((s: any) => setSettings(s))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [branchId]);

  async function handleSave() {
    setSaving(true);
    try {
      await branchApi.update(branchId, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const sections = [...new Set(SETTINGS.map((s) => s.section))];

  if (loading)
    return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ตั้งค่าสาขา</h1>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {saved ? "✓ บันทึกแล้ว" : saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </Button>
      </div>

      {sections.map((section) => (
        <Card key={section}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {SETTINGS.filter((s) => s.section === section).map((s) => (
              <div key={s.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                <Switch
                  checked={!!settings[s.key]}
                  onCheckedChange={(v) =>
                    setSettings((prev) => ({ ...prev, [s.key]: v }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
