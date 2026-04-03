"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { MemberLoginSheet } from "@/components/checkout/MemberLoginSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { useMember } from "@/hooks/useMember";
import { couponApi, orderApi, paymentApi } from "@/lib/api";
import type { BranchConfig } from "@/lib/types";

const PAY_OPTIONS = [
  {
    id: "PAY_ONLINE" as const,
    label: "จ่ายออนไลน์",
    sub: "สแกน QR PromptPay",
    icon: "📱",
  },
  {
    id: "PAY_AT_COUNTER" as const,
    label: "จ่ายที่เคาน์เตอร์",
    sub: "ไปชำระกับ cashier",
    icon: "🏪",
  },
  {
    id: "PAY_LATER" as const,
    label: "สั่งก่อน จ่ายทีหลัง",
    sub: "รอ staff เก็บเงิน",
    icon: "🕐",
  },
] as const;

type PayMode = (typeof PAY_OPTIONS)[number]["id"];

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  use(params); // token ใช้เฉพาะ router.back
  const router = useRouter();
  const cart = useCart();
  const { account } = useMember();

  const [showLogin, setShowLogin] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{
    discountAmt: number;
    description: string;
    couponId: string;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("PAY_ONLINE");
  const [loading, setLoading] = useState(false);

  // QR state
  const [qrUrl, setQrUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [isMockPayment, setIsMockPayment] = useState(false);
  const [receiptToken, setReceiptToken] = useState("");
  const [polling, setPolling] = useState(false);
  const [mockConfirming, setMockConfirming] = useState(false);

  const [branch, setBranch] = useState<BranchConfig | null>(null);

  const subtotal = cart.total();
  const discount = couponResult?.discountAmt ?? 0;
  const finalTotal = Math.max(0, subtotal - discount);

  useEffect(() => {
    const stored = localStorage.getItem("pos-branch-config");
    if (stored) setBranch(JSON.parse(stored));
  }, []);

  // poll payment status
  useEffect(() => {
    if (!polling || !paymentId) return;
    const interval = setInterval(async () => {
      try {
        const status = await paymentApi.getStatus(paymentId);
        if (status.status === "CONFIRMED") {
          clearInterval(interval);
          setPolling(false);
          cart.clearCart();
          if (receiptToken) router.push(`/r/${receiptToken}`);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [polling, paymentId, receiptToken, cart.clearCart, router.push]);

  async function applyOrRemoveCoupon() {
    if (couponResult) {
      setCouponResult(null);
      setCouponCode("");
      return;
    }
    if (!couponCode.trim()) return;
    setCouponError("");
    try {
      const result = await couponApi.validate(
        couponCode,
        "temp",
        cart.tenantId ?? "",
        account?.id,
      );
      setCouponResult(result);
    } catch (e: unknown) {
      setCouponError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  }

  async function handleMockConfirm() {
    if (!paymentId) return;
    setMockConfirming(true);
    try {
      await paymentApi.mockConfirm(paymentId);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setMockConfirming(false);
    }
  }

  async function handleCheckout() {
    if (!cart.branchId || !cart.tenantId || !cart.tenantId) return;
    if (branch?.queueDisplayName && !account && !guestName.trim()) {
      document.getElementById("guest-name-input")?.focus();
      return;
    }

    setLoading(true);
    try {
      const order = await orderApi.create({
        branchId: cart.branchId,
        tableId: cart.tableId,
        sessionId: cart.sessionId,
        checkoutMode: payMode,
        guestName: guestName || undefined,
        memberAccountId: account?.id,
        items: cart.items.map((i) => ({
          menuItemId: i.menuItemId,
          qty: i.qty,
          modifiers: i.modifiers,
          note: i.note,
        })),
      });

      if (couponResult) {
        await couponApi.apply(couponCode, order.id, cart.tenantId, account?.id);
      }

      if (payMode === "PAY_ONLINE") {
        const payment = await paymentApi.createPromptPay(order.id);
        setReceiptToken(order.receiptToken);
        setQrUrl(payment.qrCodeUrl);
        setPaymentId(payment.paymentId);
        setIsMockPayment(payment.isMock);
        setPolling(true);
      } else {
        cart.clearCart();
        router.push(`/r/${order.receiptToken}`);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  // ── QR Screen ──────────────────────────────────────────────────────
  if (qrUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-5 bg-background">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          PromptPay
        </p>
        <h2 className="text-2xl font-bold">฿{finalTotal.toFixed(0)}</h2>

        <div className="bg-white rounded-3xl p-5 shadow-lg border">
          <Image src={qrUrl} alt="PromptPay QR" width={220} height={220} />
        </div>

        <p className="text-sm text-muted-foreground text-center max-w-xs">
          เปิดแอปธนาคารแล้วสแกน QR ด้านบน
          <br />
          ระบบจะยืนยันอัตโนมัติหลังโอน
        </p>

        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          รอการยืนยัน...
        </div>

        {/* Mock confirm — dev mode only */}
        {isMockPayment && (
          <div className="w-full max-w-xs space-y-2">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-amber-700 font-medium mb-2">
                🛠 Dev Mode — Mock Payment
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={handleMockConfirm}
                disabled={mockConfirming}
              >
                {mockConfirming ? "กำลังยืนยัน..." : "จำลองการชำระเงิน ✓"}
              </Button>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            setQrUrl("");
            setPolling(false);
          }}
        >
          ← กลับ / ยกเลิก
        </Button>
      </div>
    );
  }

  // ── Checkout Form ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-lg"
        >
          ←
        </button>
        <h1 className="font-semibold text-base">ยืนยันออเดอร์</h1>
      </div>

      <div className="px-4 pt-4 pb-36 space-y-5">
        {/* Order items */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            รายการอาหาร
          </p>
          <div className="bg-card border rounded-2xl divide-y overflow-hidden">
            {cart.items.map((item) => (
              <div
                key={item.cartKey}
                className="flex justify-between items-start px-4 py-3 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug">{item.name}</p>
                  {Object.entries(item.modifiers).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {Object.values(item.modifiers).join(" · ")}
                    </p>
                  )}
                  {item.note && (
                    <p className="text-xs text-amber-600 mt-0.5 truncate">
                      ⚑ {item.note}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    ฿{(item.price * item.qty).toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">×{item.qty}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Member section */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            สมาชิก
          </p>
          {!account ? (
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4 text-left active:bg-primary/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-primary">
                    เข้าสู่ระบบสมาชิก
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    สะสมแต้ม · รับส่วนลดพิเศษ
                  </p>
                </div>
                <span className="text-primary/60 text-lg">›</span>
              </div>
            </button>
          ) : (
            <div className="bg-card border rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {account.name ?? account.phone}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {account.points} แต้มสะสม
                </p>
              </div>
              {account.tier && (
                <Badge
                  variant="outline"
                  className="shrink-0"
                  style={{
                    borderColor: account.tier.color,
                    color: account.tier.color,
                  }}
                >
                  {account.tier.name}
                </Badge>
              )}
            </div>
          )}
        </section>

        {/* Guest name */}
        {!account && (
          <section>
            <label
              htmlFor="guest-name-input"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1 block"
            >
              ชื่อสำหรับเรียก
              {branch?.queueDisplayName && (
                <span className="text-destructive ml-1 normal-case font-normal">
                  {" "}
                  (จำเป็น)
                </span>
              )}
            </label>
            <Input
              id="guest-name-input"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="เช่น คุณสมชาย (ไม่บังคับ)"
              className="h-12 rounded-2xl text-base px-4"
            />
          </section>
        )}

        {/* Coupon */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            คูปองส่วนลด
          </p>
          {couponResult ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-green-700">
                  {couponCode.toUpperCase()}
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  {couponResult.description}
                </p>
              </div>
              <button
                type="button"
                onClick={applyOrRemoveCoupon}
                className="text-xs text-muted-foreground underline ml-3"
              >
                ลบ
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="กรอก code คูปอง"
                className="flex-1 h-12 rounded-2xl text-base px-4"
              />
              <Button
                variant="outline"
                onClick={applyOrRemoveCoupon}
                className="h-12 px-5 rounded-2xl font-medium"
              >
                ใช้
              </Button>
            </div>
          )}
          {couponError && (
            <p className="text-xs text-destructive mt-1.5 px-1">{couponError}</p>
          )}
        </section>

        {/* Payment method */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            วิธีชำระเงิน
          </p>
          <div className="space-y-2">
            {PAY_OPTIONS.map((opt) => {
              const active = payMode === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPayMode(opt.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:border-primary/30 bg-card"
                  }`}
                >
                  <span className="text-2xl shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold ${active ? "text-primary" : ""}`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {opt.sub}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      active ? "border-primary bg-primary" : "border-border"
                    }`}
                  >
                    {active && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Summary */}
        <section className="bg-card border rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ยอดรวม</span>
            <span className="font-medium">฿{subtotal.toFixed(0)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>ส่วนลด</span>
              <span className="font-medium">-฿{discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>ยอดสุทธิ</span>
            <span>฿{finalTotal.toFixed(0)}</span>
          </div>
        </section>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <Button
          onClick={handleCheckout}
          disabled={loading || cart.items.length === 0}
          className="w-full h-14 rounded-2xl text-base font-bold shadow-md"
        >
          {loading
            ? "กำลังดำเนินการ..."
            : payMode === "PAY_ONLINE"
              ? `ชำระเงิน ฿${finalTotal.toFixed(0)}`
              : `ยืนยันออเดอร์ · ฿${finalTotal.toFixed(0)}`}
        </Button>
      </div>

      <MemberLoginSheet
        open={showLogin}
        tenantId={cart.tenantId ?? ""}
        onClose={() => setShowLogin(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
