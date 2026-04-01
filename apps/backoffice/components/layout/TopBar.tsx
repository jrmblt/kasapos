"use client";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

const PAGE_TITLE: Record<string, string> = {
  "/": "ภาพรวม",
  "/menu": "จัดการเมนู",
  "/tables": "โต๊ะ & QR Code",
  "/coupons": "คูปอง",
  "/loyalty": "ระบบสะสมแต้ม",
  "/reports": "รายงาน",
  "/settings": "ตั้งค่าสาขา",
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "เจ้าของร้าน",
  MANAGER: "ผู้จัดการ",
  CASHIER: "แคชเชียร์",
  KITCHEN: "ครัว",
};

export function TopBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const title = PAGE_TITLE[pathname] ?? "";

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-xs">
            {user?.name?.charAt(0) ?? "?"}
          </div>
          <div className="hidden sm:block text-right">
            <p className="font-medium text-gray-900 leading-tight">{user?.name}</p>
            <p className="text-xs text-muted-foreground leading-tight">
              {ROLE_LABEL[user?.role] ?? user?.role}
            </p>
          </div>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-xs text-muted-foreground hover:text-red-600"
        >
          ออกจากระบบ
        </Button>
      </div>
    </header>
  );
}
