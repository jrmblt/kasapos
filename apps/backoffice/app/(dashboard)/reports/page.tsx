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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { reportApi } from "@/lib/api";

const PERIOD_OPTIONS = [
  { label: "7 วัน", value: 7 },
  { label: "14 วัน", value: 14 },
  { label: "30 วัน", value: 30 },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const branchId = user?.branchId ?? "branch-silom";

  const [days, setDays] = useState(14);
  const [daily, setDaily] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [d, t, s] = await Promise.all([
          reportApi.daily(branchId, days),
          reportApi.topItems(branchId, days),
          reportApi.shifts(branchId).catch(() => []),
        ]);
        if (cancelled) return;
        setDaily(d.reverse());
        setTopItems(t);
        setShifts(s);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, branchId, days]);

  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = daily.reduce((s, d) => s + d.orders, 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (loading) return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">รายงาน</h1>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={days === opt.value ? "default" : "outline"}
              onClick={() => setDays(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">รายได้รวม</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">฿{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{days} วันที่ผ่านมา</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">ออเดอร์รวม</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOrders.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">เฉลี่ย {(totalOrders / days).toFixed(1)} / วัน</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">เฉลี่ยต่อบิล</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">฿{avgOrder.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">avg order value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">ยอดขายรายวัน</TabsTrigger>
          <TabsTrigger value="items">เมนูขายดี</TabsTrigger>
          <TabsTrigger value="shifts">กะพนักงาน</TabsTrigger>
        </TabsList>

        {/* Daily sales chart */}
        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ยอดขายรายวัน</CardTitle>
            </CardHeader>
            <CardContent>
              {daily.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="period"
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={(value) => [`฿${Number(value).toLocaleString()}`, "รายได้"]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString("th-TH", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    />
                    <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Daily table */}
          {daily.length > 0 && (
            <div className="border rounded-xl overflow-hidden mt-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">วันที่</th>
                    <th className="text-right px-4 py-3">รายได้</th>
                    <th className="text-right px-4 py-3">ออเดอร์</th>
                    <th className="text-right px-4 py-3">เฉลี่ย/บิล</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {daily.map((d) => (
                    <tr key={d.period} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {new Date(d.period).toLocaleDateString("th-TH", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ฿{d.revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">{d.orders}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        ฿{d.avgOrderValue.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Top items */}
        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">เมนูขายดี (Top 20)</CardTitle>
            </CardHeader>
            <CardContent>
              {topItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูล</p>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-muted-foreground">
                      <tr>
                        <th className="text-center px-4 py-3 w-10">#</th>
                        <th className="text-left px-4 py-3">เมนู</th>
                        <th className="text-right px-4 py-3">จำนวน</th>
                        <th className="text-right px-4 py-3">รายได้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {topItems.map((item, i) => (
                        <tr key={item.menuItemId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-center">
                            {i < 3 ? (
                              <Badge variant={i === 0 ? "default" : "secondary"} className="text-xs">
                                {i + 1}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{i + 1}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-right">{item.qty}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            ฿{item.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shifts */}
        <TabsContent value="shifts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">กะพนักงาน</CardTitle>
            </CardHeader>
            <CardContent>
              {shifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">ไม่มีข้อมูลกะ</p>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-3">พนักงาน</th>
                        <th className="text-center px-4 py-3">สถานะ</th>
                        <th className="text-left px-4 py-3">เปิด</th>
                        <th className="text-left px-4 py-3">ปิด</th>
                        <th className="text-right px-4 py-3">เงินเปิด</th>
                        <th className="text-right px-4 py-3">ควรมี</th>
                        <th className="text-right px-4 py-3">นับจริง</th>
                        <th className="text-right px-4 py-3">ผลต่าง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shifts.map((s: any) => {
                        const diff = s.difference != null ? Number(s.difference) : null;
                        return (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{s.user?.name ?? s.userId}</td>
                            <td className="px-4 py-3 text-center">
                              {s.closedAt ? (
                                <Badge variant="secondary">ปิดแล้ว</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700">เปิดอยู่</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {new Date(s.openedAt).toLocaleString("th-TH", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {s.closedAt
                                ? new Date(s.closedAt).toLocaleString("th-TH", {
                                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                  })
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">฿{Number(s.openCash).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              {s.expectedCash != null ? `฿${Number(s.expectedCash).toLocaleString()}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {s.closeCash != null ? `฿${Number(s.closeCash).toLocaleString()}` : "—"}
                            </td>
                            <td className={`px-4 py-3 text-right font-medium ${
                              diff == null ? "" : diff === 0 ? "text-green-600" : diff > 0 ? "text-blue-600" : "text-red-500"
                            }`}>
                              {diff != null ? `${diff > 0 ? "+" : ""}฿${diff.toLocaleString()}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
