"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("owner@krua.com");
  const [pin, setPin] = useState("");
  const { login, loading, error, user, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && user) router.replace("/");
  }, [hydrated, user, router]);

  if (!hydrated || user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border rounded-2xl p-8 w-full max-w-sm shadow-sm space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kasa Backoffice</h1>
          <p className="text-sm text-muted-foreground mt-1">จัดการร้านของคุณ</p>
        </div>

        <div className="space-y-3">
          <Input
            type="email"
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login(email, pin)}
            maxLength={6}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          className="w-full bg-violet-600 hover:bg-violet-700"
          onClick={() => login(email, pin)}
          disabled={loading}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1 border rounded-lg p-3 bg-gray-50">
          <p className="font-medium">Demo accounts:</p>
          <p>owner@krua.com / 1234</p>
          <p>manager.s@krua.com / 2345</p>
        </div>
      </div>
    </div>
  );
}
