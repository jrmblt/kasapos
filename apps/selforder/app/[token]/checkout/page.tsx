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

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const cart = useCart();
  const { account, token: memberToken } = useMember();

  const [showLogin, setShowLogin] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{
    discountAmt: number;
    description: string;
    couponId: string;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [payMode, setPayMode] = useState<
    "PAY_ONLINE" | "PAY_LATER" | "PAY_AT_COUNTER"
  >("PAY_ONLINE");
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [receiptToken, setReceiptToken] = useState("");
  const [polling, setPolling] = useState(false);
  const [branch, setBranch] = useState<BranchConfig | null>(null);

  const subtotal = cart.total();
  const discount = couponResult?.discountAmt ?? 0;
  const finalTotal = Math.max(0, subtotal - discount);

  useEffect(() => {
    // ดึง branch config จาก cart context หรือ localStorage
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
          if (receiptToken) {
            router.push(`/r/${receiptToken}`);
          }
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
        "temp", // validate ก่อน order จริง
        cart.tenantId!,
        account?.id,
      );
      setCouponResult(result);
    } catch (e: any) {
      setCouponError(e.message);
    }
  }

  async function handleCheckout() {
    console.log("cart", cart);
    if (!cart.branchId || !cart.tenantId) return;

    console.log("cart.branchId", cart.branchId);
    console.log("cart.tenantId", cart.tenantId);

    console.log("guestName before", guestName);
    console.log("account before", account);

    // ถ้า branch ต้องการชื่อ guest และไม่มี member
    if (branch?.queueDisplayName && !account && !guestName.trim()) {
      document.getElementById("guest-name-input")?.focus();
      return;
    }

    console.log("guestName", guestName);
    console.log("account", account);

    setLoading(true);
    try {
      // สร้าง order
      const order = await orderApi.create({
        branchId: cart.branchId,
        tableId: cart.tableId,
        sessionId: cart.sessionId,
        type: "SELF_ORDER",
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

      // apply coupon ถ้ามี
      if (couponResult) {
        await couponApi.apply(couponCode, order.id, cart.tenantId, account?.id);
      }

      if (payMode === "PAY_ONLINE") {
        const payment = await paymentApi.createPromptPay(order.id);
        setReceiptToken(order.receiptToken);
        setQrUrl(payment.qrCodeUrl);
        setPaymentId(payment.paymentId);
        setPolling(true);
      } else {
        // PAY_LATER หรือ PAY_AT_COUNTER
        cart.clearCart();
        router.push(`/r/${order.receiptToken}`);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  // หน้า QR payment
  if (qrUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
        <h2 className="text-xl font-semibold">สแกนเพื่อชำระเงิน</h2>
        <div className="bg-white p-4 rounded-2xl border">
          <Image src={qrUrl} alt="PromptPay QR" width={240} height={240} />
        </div>
        <p className="text-2xl font-bold">฿{finalTotal.toFixed(0)}</p>
        <p className="text-sm text-muted-foreground animate-pulse">
          รอการยืนยันการชำระเงิน...
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setQrUrl("");
            setPolling(false);
          }}
        >
          ยกเลิก
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-36">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="text-xl">
          ←
        </button>
        <h1 className="font-semibold">ยืนยันออเดอร์</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Order items */}
        <div className="bg-card border rounded-2xl divide-y">
          {cart.items.map((item) => (
            <div
              key={item.cartKey}
              className="flex justify-between items-start px-4 py-3"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                {Object.entries(item.modifiers).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Object.values(item.modifiers).join(" · ")}
                  </p>
                )}
                {item.note && (
                  <p className="text-xs text-amber-600 mt-0.5">⚑ {item.note}</p>
                )}
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-medium">
                  ฿{(item.price * item.qty).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">×{item.qty}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Member section */}
        {!account ? (
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4 text-left"
          >
            <p className="font-medium text-sm text-primary">เข้าสู่ระบบสมาชิก</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              สะสมแต้ม รับส่วนลดพิเศษ และติดตาม order
            </p>
          </button>
        ) : (
          <div className="bg-card border rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">
                {account.name ?? account.phone}
              </p>
              <p className="text-xs text-muted-foreground">
                {account.points} แต้มสะสม
              </p>
            </div>
            <Badge
              variant="outline"
              style={{
                borderColor: account.tier?.color,
                color: account.tier?.color,
              }}
            >
              {account.tier?.name ?? "Member"}
            </Badge>
          </div>
        )}

        {/* Guest name (ถ้าไม่ได้ login) */}
        {!account && (
          <div>
            <label
              htmlFor="guest-name-input"
              className="text-sm font-medium block mb-1.5"
            >
              ชื่อสำหรับเรียก
              {branch?.queueDisplayName ? (
                <span className="text-destructive ml-1">*</span>
              ) : (
                <span className="text-muted-foreground font-normal ml-1">
                  (ไม่บังคับ)
                </span>
              )}
            </label>
            <Input
              // id="guest-name-input"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="เช่น คุณสมชาย"
              className="h-11 rounded-xl"
            />
          </div>
        )}
        {/* {!account && (
          <div>
            <label
              htmlFor="guest-name-input"
              className="text-sm font-medium block mb-1.5"
            >
              ชื่อสำหรับเรียก{" "}
              <span className="text-muted-foreground font-normal">
                (ไม่บังคับ)
              </span>
            </label>
            <Input
              // id="guest-name-input"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="เช่น คุณสมชาย"
              className="h-11 rounded-xl"
            />
          </div>
        )} */}

        {/* Coupon */}
        <div>
          <label
            htmlFor="coupon-code-input"
            className="text-sm font-medium block mb-1.5"
          >
            คูปองส่วนลด
          </label>
          {couponResult ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-green-700">
                  {couponCode.toUpperCase()}
                </p>
                <p className="text-xs text-green-600">
                  {couponResult.description}
                </p>
              </div>
              <button
                type="button"
                onClick={applyOrRemoveCoupon}
                className="text-xs text-muted-foreground underline"
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
                className="flex-1 h-11 rounded-xl"
              />
              <Button
                variant="outline"
                onClick={applyOrRemoveCoupon}
                className="h-11 rounded-xl"
              >
                ใช้
              </Button>
            </div>
          )}
          {couponError && (
            <p className="text-xs text-destructive mt-1">{couponError}</p>
          )}
        </div>

        {/* Payment method */}
        <div>
          <label
            htmlFor="payment-method-input"
            className="text-sm font-medium block mb-2"
          >
            วิธีชำระเงิน
          </label>
          <div className="space-y-2">
            {[
              {
                id: "PAY_ONLINE",
                label: "จ่ายออนไลน์ (PromptPay)",
                desc: "สแกน QR จ่ายเดี๋ยวนี้",
              },
              {
                id: "PAY_AT_COUNTER",
                label: "จ่ายที่เคาน์เตอร์",
                desc: "ไปชำระเงินกับ cashier",
              },
              {
                id: "PAY_LATER",
                label: "สั่งก่อน จ่ายทีหลัง",
                desc: "รอ staff เก็บเงิน",
              },
            ].map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => setPayMode(opt.id as any)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  payMode === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-card border rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ยอดรวม</span>
            <span>฿{subtotal.toFixed(0)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>ส่วนลด</span>
              <span>-฿{discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-2 border-t">
            <span>ยอดสุทธิ</span>
            <span>฿{finalTotal.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Checkout button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button
          onClick={handleCheckout}
          disabled={loading || cart.items.length === 0}
          className="w-full h-14 rounded-2xl text-base font-semibold"
        >
          {loading
            ? "กำลังดำเนินการ..."
            : payMode === "PAY_ONLINE"
              ? `ชำระเงิน ฿${finalTotal.toFixed(0)}`
              : "ยืนยันออเดอร์"}
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
