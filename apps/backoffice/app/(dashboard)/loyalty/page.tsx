"use client";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { loyaltyApi } from "@/lib/api";

export default function LoyaltyPage() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState("");
  const [member, setMember] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const loadTiers = useCallback(async () => {
    try {
      const data = await loyaltyApi.tiers();
      setTiers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  async function handleSearch() {
    if (!phone.trim()) return;
    setSearching(true);
    setSearchError("");
    setMember(null);
    try {
      const data = await loyaltyApi.getByPhone(phone.trim());
      setMember(data);
    } catch (e: any) {
      setSearchError(e.message ?? "ไม่พบสมาชิก");
    } finally {
      setSearching(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ระบบสะสมแต้ม</h1>

      {/* Tier cards */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          ระดับสมาชิก ({tiers.length} ระดับ)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tiers.map((tier) => (
            <Card key={tier.id} className="relative overflow-hidden">
              {tier.color && (
                <div
                  className="absolute top-0 left-0 w-full h-1"
                  style={{ backgroundColor: tier.color }}
                />
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {tier.color && (
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: tier.color }}
                    />
                  )}
                  {tier.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>แต้มขั้นต่ำ</span>
                  <span className="font-medium text-foreground">{tier.minPoints.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>ตัวคูณแต้ม</span>
                  <span className="font-medium text-foreground">×{Number(tier.multiplier)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {tiers.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-8">
              ยังไม่ได้ตั้งค่าระดับสมาชิก
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Member search */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          ค้นหาสมาชิก
        </h2>
        <div className="flex gap-3 max-w-md">
          <Input
            placeholder="เบอร์โทร เช่น 0812345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching || !phone.trim()}>
            {searching ? "กำลังค้น..." : "ค้นหา"}
          </Button>
        </div>

        {searchError && <p className="text-sm text-red-500">{searchError}</p>}

        {member && (
          <Card className="max-w-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{member.phone}</CardTitle>
                {member.tier && (
                  <Badge
                    style={member.tier.color ? { backgroundColor: member.tier.color, color: "#fff" } : undefined}
                  >
                    {member.tier.name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox label="แต้มคงเหลือ" value={member.points.toLocaleString()} />
                <StatBox label="แต้มสะสมรวม" value={member.totalEarned.toLocaleString()} />
                <StatBox label="ยอดซื้อรวม" value={`฿${Number(member.totalSpend).toLocaleString()}`} />
                <StatBox label="มาใช้บริการ" value={`${member.visitCount} ครั้ง`} />
              </div>

              {member.nextTier && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">ถัดไป: </span>
                  <span className="font-medium">{member.nextTier.name}</span>
                  <span className="text-muted-foreground">
                    {" "}(ต้องการอีก {(member.nextTier.minPoints - member.totalEarned).toLocaleString()} แต้ม)
                  </span>
                </div>
              )}

              {member.transactions?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">ประวัติล่าสุด</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2">วันที่</th>
                          <th className="text-center px-3 py-2">ประเภท</th>
                          <th className="text-right px-3 py-2">แต้ม</th>
                          <th className="text-right px-3 py-2">คงเหลือ</th>
                          <th className="text-left px-3 py-2">หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {member.transactions.map((tx: any) => (
                          <tr key={tx.createdAt} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString("th-TH", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge variant={tx.type === "EARN" ? "default" : "destructive"} className="text-xs">
                                {tx.type === "EARN" ? "สะสม" : "แลก"}
                              </Badge>
                            </td>
                            <td className={`px-3 py-2 text-right font-medium ${tx.delta > 0 ? "text-green-600" : "text-red-500"}`}>
                              {tx.delta > 0 ? "+" : ""}{tx.delta}
                            </td>
                            <td className="px-3 py-2 text-right">{tx.balance}</td>
                            <td className="px-3 py-2 text-muted-foreground text-xs">{tx.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
