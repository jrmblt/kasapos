const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

async function req<T>(
  path: string,
  options: RequestInit = {},
  memberToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (memberToken) headers["x-member-token"] = memberToken;

  const res = await fetch(`${API}/api${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Table ─────────────────────────────────────────────
export const tableApi = {
  getByToken: (token: string) =>
    req<{ id: string; name: string; branchId: string; branch: BranchConfig }>(
      `/tables/by-token/${token}`,
    ),
};

// ── Menu ─────────────────────────────────────────────
export const menuApi = {
  list: (tenantId: string) => req<MenuItem[]>(`/menu?tenantId=${tenantId}`),
  categories: (tenantId: string) =>
    req<MenuCategory[]>(`/menu/categories?tenantId=${tenantId}`),
};

// ── Order ─────────────────────────────────────────────
export const orderApi = {
  create: (body: unknown) =>
    req<{ id: string; receiptToken: string }>("/orders/self-order", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getByReceipt: (token: string) => req<any>(`/orders/receipt/${token}`),
};

// ── Payment ───────────────────────────────────────────
export const paymentApi = {
  createPromptPay: (orderId: string) =>
    req<{
      paymentId: string;
      qrCodeUrl: string;
      amount: number;
      expiresAt: string;
    }>("/payments/promptpay", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    }),
  getStatus: (paymentId: string) =>
    req<{ status: string }>(`/payments/${paymentId}/status`),
};

// ── Member ─────────────────────────────────────────────
export const memberApi = {
  requestOtp: (phone: string, tenantId: string) =>
    req<{ message: string; _devCode?: string }>("/member/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone, tenantId }),
    }),
  verifyOtp: (phone: string, tenantId: string, code: string) =>
    req<{ token: string; account: MemberAccount; isNewMember: boolean }>(
      "/member/otp/verify",
      { method: "POST", body: JSON.stringify({ phone, tenantId, code }) },
    ),
  validateSession: (token: string) =>
    req<MemberAccount>("/member/session/validate", { method: "POST" }, token),
  updateProfile: (name: string, token: string) =>
    req<MemberAccount>(
      "/member/profile",
      {
        method: "PATCH",
        body: JSON.stringify({ name }),
      },
      token,
    ),
};

// ── Coupon ─────────────────────────────────────────────
export const couponApi = {
  validate: (
    code: string,
    orderId: string,
    tenantId: string,
    accountId?: string,
  ) =>
    req<{ discountAmt: number; description: string; couponId: string }>(
      "/coupons/validate",
      {
        method: "POST",
        body: JSON.stringify({ code, orderId, tenantId, accountId }),
      },
    ),
  apply: (
    code: string,
    orderId: string,
    tenantId: string,
    accountId?: string,
  ) =>
    req<{ discountAmt: number; newTotal: number }>("/coupons/apply", {
      method: "POST",
      body: JSON.stringify({ code, orderId, tenantId, accountId }),
    }),
};

// ── Queue ─────────────────────────────────────────────
export const queueApi = {
  getByOrder: (orderId: string) =>
    req<{
      ticketNo: number;
      displayCode: string;
      status: string;
      aheadCount: number;
    }>(`/queue/by-order/${orderId}`),
};

// ── Loyalty ───────────────────────────────────────────
export const loyaltyApi = {
  getByOrder: (orderId: string) =>
    req<{ points: number; pointsEarned: number; tier: any } | null>(
      `/loyalty/by-order/${orderId}`,
    ),
};

import type {
  BranchConfig,
  MemberAccount,
  MenuCategory,
  MenuItem,
} from "./types";
