"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { login, saveToken } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await login(email, pin);
      saveToken(accessToken);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#111",
          border: "1px solid #222",
          borderRadius: 12,
          padding: "40px 48px",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          KDS
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#666",
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          เข้าสู่ระบบเพื่อใช้งาน Kitchen Display
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>
              อีเมล
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="staff@example.com"
              style={{
                width: "100%",
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>
              PIN (4-6 หลัก)
            </span>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              minLength={4}
              maxLength={6}
              inputMode="numeric"
              placeholder="••••"
              style={{
                width: "100%",
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 20,
                letterSpacing: "0.3em",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </label>

          {error && (
            <div
              style={{
                background: "#2a1010",
                border: "1px solid #5a2020",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#f08080",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#333" : "#2d5a2d",
              border: "none",
              borderRadius: 8,
              padding: "12px",
              color: loading ? "#666" : "#7fff7f",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background .15s",
            }}
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
