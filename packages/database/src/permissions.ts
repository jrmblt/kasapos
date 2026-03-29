export const Permission = {
  // ── Orders ──────────────────────────────────────────
  ORDER_CREATE: "order:create",
  ORDER_VIEW: "order:view",
  ORDER_VOID: "order:void", // ต้องมี PIN ด้วย
  ORDER_DISCOUNT: "order:discount",

  // ── Menu ────────────────────────────────────────────
  MENU_READ: "menu:read",
  MENU_WRITE: "menu:write", // เพิ่ม/แก้/ลบ เมนู
  STOCK_ADJUST: "stock:adjust", // ปรับ stock manual

  // ── Tables ──────────────────────────────────────────
  TABLE_MANAGE: "table:manage", // เพิ่ม/แก้/ลบ โต๊ะ

  // ── Payments ────────────────────────────────────────
  PAYMENT_PROCESS: "payment:process",
  PAYMENT_REFUND: "payment:refund",

  // ── Reports ─────────────────────────────────────────
  REPORT_VIEW: "report:view",
  REPORT_EXPORT: "report:export",

  // ── Staff ───────────────────────────────────────────
  STAFF_VIEW: "staff:view",
  STAFF_MANAGE: "staff:manage", // เพิ่ม/แก้/ลบ พนักงาน

  // ── Shifts ──────────────────────────────────────────
  SHIFT_OPEN: "shift:open",
  SHIFT_CLOSE: "shift:close",

  // ── Queue ───────────────────────────────────────────
  QUEUE_MANAGE: "queue:manage", // เรียกคิว / ข้ามคิว

  // ── Settings ────────────────────────────────────────
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write", // แก้ settings ร้าน
  ROLES_MANAGE: "roles:manage", // สร้าง/แก้ custom roles
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

// ── Built-in role → permissions mapping ──────────────
// ใช้ตอน seed system roles และเป็น fallback ถ้าไม่มี customRole
export const BASE_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: Object.values(Permission) as Permission[], // ทุก permission

  MANAGER: [
    Permission.ORDER_CREATE,
    Permission.ORDER_VIEW,
    Permission.ORDER_VOID,
    Permission.ORDER_DISCOUNT,
    Permission.MENU_READ,
    Permission.MENU_WRITE,
    Permission.STOCK_ADJUST,
    Permission.TABLE_MANAGE,
    Permission.PAYMENT_PROCESS,
    Permission.PAYMENT_REFUND,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.STAFF_VIEW,
    Permission.SHIFT_OPEN,
    Permission.SHIFT_CLOSE,
    Permission.QUEUE_MANAGE,
    Permission.SETTINGS_READ,
  ],

  CASHIER: [
    Permission.ORDER_CREATE,
    Permission.ORDER_VIEW,
    Permission.MENU_READ,
    Permission.PAYMENT_PROCESS,
    Permission.SHIFT_OPEN,
    Permission.SHIFT_CLOSE,
    Permission.QUEUE_MANAGE,
  ],

  KITCHEN: [
    Permission.ORDER_VIEW,
    Permission.MENU_READ,
    Permission.QUEUE_MANAGE,
  ],
};
