import type {
  AuthResponse,
  CashPaymentResult,
  Category,
  MenuItem,
  Order,
  PaymentStatusResult,
  PromptPayResult,
  Shift,
  Table,
} from "./types";

const BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333") + "/api";

// ── Token store (memory only — shared device) ─────────────────────────────────
let _accessToken = "";
export const setAccessToken = (t: string) => {
  _accessToken = t;
};
export const getAccessToken = () => _accessToken;

// ── Base fetch ────────────────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  })

  // ── Token หมดอายุ → clear session → redirect login ─────
  if (res.status === 401) {
    setAccessToken('')
    // clear sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('kasa-pos-session')
      window.location.href = '/login'
    }
    throw new ApiError(401, 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new ApiError(res.status, body.message ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, pin: string) =>
    post<AuthResponse>("/auth/login", { email, pin }),
};

// ── Tables ────────────────────────────────────────────────────────────────────
export const tableApi = {
  list: (branchId: string) => get<Table[]>(`/tables/branch/${branchId}`),
};

// ── Menu ──────────────────────────────────────────────────────────────────────
export const menuApi = {
  categories: (tenantId: string) =>
    get<Category[]>(`/menu/categories?tenantId=${tenantId}`),

  items: (tenantId: string) =>
    get<MenuItem[]>(`/menu?tenantId=${tenantId}`),
};

// ── Orders ────────────────────────────────────────────────────────────────────
interface CreateOrderBody {
  branchId: string;
  tableId?: string;
  sessionId?: string;
  type: "DINE_IN" | "TAKEAWAY";
  items: Array<{
    menuItemId: string;
    qty: number;
    modifiers: Record<string, string>;
    note?: string;
  }>;
}

export const orderApi = {
  create: (body: CreateOrderBody) => post<Order>("/orders", body),

  get: (id: string) => get<Order>(`/orders/${id}`),

  voidItem: (
    orderId: string,
    itemId: string,
    body: { voidReason: string; pin: string },
  ) =>
    patch<{ success: boolean }>(
      `/orders/${orderId}/items/${itemId}/void`,
      body,
    ),

  complete: (id: string) => patch<Order>(`/orders/${id}/complete`),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  cash: (body: { orderId: string; branchId: string; cashReceived: number }) =>
    post<CashPaymentResult>("/payments/cash", body),

  promptpay: (orderId: string) =>
    post<PromptPayResult>("/payments/promptpay", { orderId }),

  status: (paymentId: string) =>
    get<PaymentStatusResult>(`/payments/${paymentId}/status`),

  mockConfirm: (paymentId: string) =>
    post<{ success: boolean }>(`/payments/mock-confirm/${paymentId}`),
};

// ── Shifts ────────────────────────────────────────────────────────────────────
export const shiftApi = {
  open: (branchId: string, userId: string, openCash: number) =>
    post<Shift>("/shifts/open", { branchId, userId, openCash }),

  close: (shiftId: string, closeCash: number) =>
    patch<Shift>(`/shifts/${shiftId}/close`, { closeCash }),

  current: (branchId: string, userId: string) =>
    get<Shift | null>(`/shifts/current?branchId=${branchId}&userId=${userId}`),
};
