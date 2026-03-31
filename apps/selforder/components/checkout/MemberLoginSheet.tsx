"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMember } from "@/hooks/useMember";
import { memberApi } from "@/lib/api";

interface Props {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "phone" | "otp" | "name";

export function MemberLoginSheet({
  open,
  tenantId,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  const { setMember } = useMember();

  async function handleRequestOtp() {
    if (!/^0[0-9]{9}$/.test(phone)) {
      setError("กรุณากรอกเบอร์โทร 10 หลัก");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await memberApi.requestOtp(phone, tenantId);
      if (res._devCode) setDevCode(res._devCode); // dev mode
      setStep("otp");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError("");
    try {
      const res = await memberApi.verifyOtp(phone, tenantId, otp);
      setToken(res.token);
      setMember(res.account, res.token);
      if (res.isNewMember) {
        setIsNew(true);
        setStep("name");
      } else {
        onSuccess();
        onClose();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetName() {
    if (!name.trim()) {
      onSuccess();
      onClose();
      return;
    }
    setLoading(true);
    try {
      await memberApi.updateProfile(name, token);
      onSuccess();
      onClose();
    } catch {
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-10">
        <SheetHeader className="pb-6">
          <SheetTitle>
            {step === "phone" && "เข้าสู่ระบบสมาชิก"}
            {step === "otp" && "กรอกรหัส OTP"}
            {step === "name" && "ยินดีต้อนรับ!"}
          </SheetTitle>
        </SheetHeader>

        {step === "phone" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              กรอกเบอร์โทรเพื่อสะสมแต้มและรับสิทธิ์พิเศษ
            </p>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="0812345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 text-base rounded-xl"
              maxLength={10}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full h-12 rounded-xl"
            >
              {loading ? "กำลังส่ง OTP..." : "ส่ง OTP"}
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full">
              ข้ามไปก่อน (สั่งแบบ Guest)
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ส่ง OTP ไปที่ <strong>{phone}</strong>
            </p>
            {devCode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm">
                [Dev] OTP: <strong>{devCode}</strong>
              </div>
            )}
            <Input
              type="text"
              inputMode="numeric"
              placeholder="______"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="h-12 text-center text-2xl tracking-widest rounded-xl"
              maxLength={6}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full h-12 rounded-xl"
            >
              {loading ? "กำลังตรวจสอบ..." : "ยืนยัน"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
              }}
              className="w-full"
            >
              ขอ OTP ใหม่
            </Button>
          </div>
        )}

        {step === "name" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              สมัครสมาชิกสำเร็จ! ใส่ชื่อเพื่อให้เราเรียกได้ถูก
            </p>
            <Input
              placeholder="ชื่อของคุณ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl"
            />
            <Button
              onClick={handleSetName}
              disabled={loading}
              className="w-full h-12 rounded-xl"
            >
              บันทึก
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full"
            >
              ข้ามไปก่อน
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
