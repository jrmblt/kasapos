export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";
export type OrderItemStatus = "PENDING" | "PREPARING" | "DONE" | "VOIDED";
export type PaymentMethod = "CASH" | "PROMPTPAY" | "CREDIT_CARD" | "DEBIT_CARD";
export type PaymentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIAL_REFUND";

export interface PosUser {
  id: string;
  name: string;
  role: string;
  branchId: string | null;
  tenantId: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: PosUser;
}

export interface ModifierOption {
  name: string;
  priceAdd: number;
}

export interface Modifier {
  id: string;
  name: string;
  type: "SINGLE_SELECT" | "MULTI_SELECT";
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  stockQty: number | null;
  tags: string[];
  modifiers: Modifier[];
  category: Category;
}

export interface ActiveOrderSummary {
  id: string;
  total: number;
  itemCount: number;
  status: OrderStatus;
}

export interface Table {
  id: string;
  name: string;
  zone: string | null;
  status: TableStatus;
  capacity: number;
  activeOrder?: ActiveOrderSummary;
}

export interface OrderItemModifiers {
  [key: string]: string;
}

export interface OrderItem {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
  modifiers: OrderItemModifiers;
  note: string | null;
  status: OrderItemStatus;
  voidReason: string | null;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  cashReceived: number | null;
  changeAmt: number | null;
  status: PaymentStatus;
}

export interface Order {
  id: string;
  branchId: string;
  tableId: string | null;
  sessionId: string | null;
  status: OrderStatus;
  subtotal: number;
  discountAmt: number;
  total: number;
  receiptToken: string | null;
  items: OrderItem[];
  payments: Payment[];
  table: { name: string; zone: string | null } | null;
}

export interface CashPaymentResult {
  success: boolean;
  changeAmt: number;
  receiptToken: string | null;
}

export interface PromptPayResult {
  paymentId: string;
  qrCodeUrl: string;
  amount: number;
  expiresAt: string;
  isMock: boolean;
}

export interface PaymentStatusResult {
  id: string;
  status: PaymentStatus;
}

export interface ReceiptData {
  id: string;
  receiptNo: string | null;
  branchName: string;
  tableName: string | null;
  createdAt: string;
  completedAt: string | null;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    modifiers: Record<string, string>;
    note: string | null;
  }>;
  subtotal: number;
  discountAmt: number;
  total: number;
  payments: Array<{
    method: PaymentMethod;
    amount: number;
    cashReceived: number | null;
    changeAmt: number | null;
  }>;
}
