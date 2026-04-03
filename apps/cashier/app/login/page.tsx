"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useCashierAuth } from "@/hooks/useCashierAuth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { user, hydrated, loading, error, login } = useCashierAuth();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const emailId = useId();
  const pinId = useId();

  useEffect(() => {
    if (hydrated && user) {
      const targetBranch = user.branchId ?? "default";
      router.replace(`/${targetBranch}`);
    }
  }, [hydrated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(email.trim(), pin.trim());
    if (ok) {
      const state = useCashierAuth.getState();
      const branch = state.user?.branchId ?? "default";
      router.replace(`/${branch}`);
    }
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary/5">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white text-2xl font-bold mb-4">
            K
          </div>
          <h1 className="text-2xl font-bold text-foreground">Kasa Cashier</h1>
          <p className="text-sm text-muted-foreground mt-1">สำหรับพนักงานเก็บเงิน</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={emailId} className="text-sm font-medium text-foreground">
              อีเมล
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="username"
              className={cn(
                "w-full px-4 py-3 rounded-xl border bg-background text-sm",
                "border-input focus:outline-none focus:ring-2 focus:ring-primary/30",
                "placeholder:text-muted-foreground",
              )}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={pinId} className="text-sm font-medium text-foreground">
              PIN / รหัสผ่าน
            </label>
            <input
              id={pinId}
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
              className={cn(
                "w-full px-4 py-3 rounded-xl border bg-background text-sm",
                "border-input focus:outline-none focus:ring-2 focus:ring-primary/30",
                "placeholder:text-muted-foreground",
              )}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-3.5 rounded-xl font-semibold text-sm transition-all",
              "bg-primary text-primary-foreground",
              "disabled:opacity-50 active:scale-[0.98]",
            )}
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
