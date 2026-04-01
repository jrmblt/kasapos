"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ภาพรวม", icon: "📊", roles: ["OWNER", "MANAGER"] },
  { href: "/menu", label: "จัดการเมนู", icon: "🍜", roles: ["OWNER", "MANAGER"] },
  {
    href: "/tables",
    label: "โต๊ะ & QR",
    icon: "🪑",
    roles: ["OWNER", "MANAGER"],
  },
  { href: "/coupons", label: "คูปอง", icon: "🎟️", roles: ["OWNER", "MANAGER"] },
  {
    href: "/loyalty",
    label: "สะสมแต้ม",
    icon: "⭐",
    roles: ["OWNER", "MANAGER"],
  },
  {
    href: "/reports",
    label: "รายงาน",
    icon: "📈",
    roles: ["OWNER", "MANAGER"],
  },
  { href: "/settings", label: "ตั้งค่าสาขา", icon: "⚙️", roles: ["OWNER"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 h-screen bg-white border-r flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b">
        <p className="font-bold text-lg text-violet-600">Kasa</p>
        <p className="text-xs text-muted-foreground">Backoffice</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems
          .filter((item) => !user?.role || item.roles.includes(user.role))
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
      </nav>

      {/* User */}
      <div className="px-4 py-3 border-t">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user?.name}
        </p>
        <p className="text-xs text-muted-foreground">{user?.role}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-2 text-xs text-red-500 hover:text-red-700"
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
