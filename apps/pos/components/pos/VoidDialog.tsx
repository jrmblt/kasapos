"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, pin: string) => Promise<void>;
}

export function VoidDialog({ open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setReason("");
    setPin("");
    setError("");
    setLoading(false);
  }

  async function handleConfirm() {
    if (!reason.trim()) {
      setError("กรุณากรอกเหตุผล");
      return;
    }
    if (pin.length < 4) {
      setError("PIN ต้อง 4-6 หลัก");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onConfirm(reason.trim(), pin);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">ยกเลิกรายการ</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <label
              htmlFor="reason"
              className="text-sm text-zinc-400 block mb-1.5"
            >
              เหตุผล
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น ลูกค้าเปลี่ยนใจ"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label htmlFor="pin" className="text-sm text-zinc-400 block mb-1.5">
              Manager PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="••••"
              maxLength={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={loading}
            className="text-zinc-400 hover:text-white"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "กำลังดำเนินการ..." : "ยืนยันยกเลิก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
