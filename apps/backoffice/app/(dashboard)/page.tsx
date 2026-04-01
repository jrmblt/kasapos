"use client";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { menuApi, reportApi } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const branchId = user?.branchId ?? "branch-silom";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [s, t, items] = await Promise.all([
          reportApi.daily(branchId, 14),
          reportApi.topItems(branchId, 7),
          menuApi.items(),
        ]);
        if (cancelled) return;
        setSales(s);
        setTopItems(t.slice(0, 5));
        setLowStock(
          items.filter(
            (i: any) =>
              i.stockQty !== null && i.stockQty <= (i.stockAlert ?? 5),
          ),
        );
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [branchId, user]);

  // คำนวณ stats
  const todayRevenue = sales[0]?.revenue ?? 0;
  const todayOrders = sales[0]?.orders ?? 0;
  const weekRevenue = sales
    .slice(0, 7)
    .reduce((s: number, r: any) => s + r.revenue, 0);
  const weekOrders = sales
    .slice(0, 7)
    .reduce((s: number, r: any) => s + r.orders, 0);

  if (loading) {
    return <div className="text-muted-foreground text-sm p-8">กำลังโหลด...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ภาพรวม</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString("th-TH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "ยอดขายวันนี้",
            value: `฿${todayRevenue.toLocaleString()}`,
            sub: `${todayOrders} ออเดอร์`,
          },
          {
            label: "ยอดขาย 7 วัน",
            value: `฿${weekRevenue.toLocaleString()}`,
            sub: `${weekOrders} ออเดอร์`,
          },
          {
            label: "เมนูใกล้หมด",
            value: String(lowStock.length),
            sub: "รายการ",
            alert: lowStock.length > 0,
          },
          {
            label: "เมนูที่มีทั้งหมด",
            value: String(topItems.length > 0 ? "—" : "—"),
            sub: "กำลังโหลด",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p
                className={`text-2xl font-bold mt-1 ${s.alert ? "text-red-600" : "text-gray-900"}`}
              >
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ยอดขาย 14 วันล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...sales].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v) => [`฿${Number(v).toLocaleString()}`, "ยอดขาย"]}
                labelFormatter={(l) => new Date(l).toLocaleDateString("th-TH")}
              />
              <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">เมนูขายดี 7 วัน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topItems.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      ฿{Number(item.revenue ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.qty} จาน
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              เมนูใกล้หมด
              {lowStock.length > 0 && (
                <Badge variant="destructive">{lowStock.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีเมนูที่ใกล้หมด ✓</p>
            ) : (
              <div className="space-y-2">
                {lowStock.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{item.name}</span>
                    <Badge
                      variant={
                        item.stockQty === 0 ? "destructive" : "secondary"
                      }
                    >
                      เหลือ {item.stockQty}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
