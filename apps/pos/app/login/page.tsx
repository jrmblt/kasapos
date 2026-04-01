"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePosAuth } from "@/hooks/usePosAuth";

export default function LoginPage() {
  const router = useRouter();
  const { user, hydrated, loading, error, login } = usePosAuth();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  // redirect เฉพาะหลัง hydrate และมี user
  useEffect(() => {
    if (hydrated && user?.branchId) {
      router.replace(`/${user.branchId}`);
    }
  }, [hydrated, user?.branchId, router]);

  // รอ hydrate ก่อนแสดงผล (ป้องกัน flash)
  if (!hydrated) return null;

  // ถ้ามี user อยู่แล้ว รอ redirect
  if (user?.branchId) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">กำลังเข้าสู่ระบบ...</p>
      </div>
    );
  }

  async function handleLogin() {
    if (!email || !pin) return;
    const ok = await login(email, pin);
    // redirect จัดการโดย useEffect ด้านบน ผ่าน user state
    if (!ok) {
      // error แสดงจาก store แล้ว
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Kasa POS</h1>
          <p className="text-zinc-400 text-sm mt-1">เข้าสู่ระบบเพื่อเริ่มกะ</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="w-full h-12 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
          />
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            maxLength={6}
            autoComplete="current-password"
            className="w-full h-12 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <Button
          type="button"
          onClick={handleLogin}
          disabled={loading || !email || !pin}
          className="w-full h-12 rounded-xl text-base font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </Button>
      </div>
    </div>
  );
}
