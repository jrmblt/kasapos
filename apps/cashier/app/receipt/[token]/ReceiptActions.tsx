"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
    >
      พิมพ์ใบเสร็จ
    </button>
  );
}

export function ShareButton({ token }: { token: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        const url = `${window.location.origin}/receipt/${token}`;
        if (navigator.share) {
          await navigator.share({ title: "ใบเสร็จรับเงิน", url });
        } else {
          await navigator.clipboard.writeText(url);
          alert("คัดลอก link ใบเสร็จแล้ว");
        }
      }}
      className="px-4 py-1.5 rounded-lg border border-border text-sm font-medium"
    >
      แชร์
    </button>
  );
}
