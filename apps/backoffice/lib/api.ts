const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333') + '/api'

let _token = ''
export const setToken = (t: string) => { _token = t }
export const getToken = () => _token

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${_token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  if (res.status === 401) {
    setToken('')
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('kasa-bo-session')
      window.location.href = '/login'
    }
    throw new ApiError(401, 'Session หมดอายุ')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.message ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json()
}

const get = <T>(path: string) => req<T>(path)
const post = <T>(path: string, body?: unknown) => req<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
const patch = <T>(path: string, body?: unknown) => req<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
const del = <T>(path: string) => req<T>(path, { method: 'DELETE' })

export const authApi = {
  login: (email: string, pin: string) =>
    post<{ accessToken: string; user: any }>('/auth/login', { email, pin }),
}

export const dashboardApi = {
  stats: (branchId: string) =>
    get<any>(`/reports/dashboard?branchId=${branchId}`),
  topItems: (branchId: string, days = 7) =>
    get<any[]>(`/reports/top-items?branchId=${branchId}&days=${days}`),
  dailySales: (branchId: string, days = 30) =>
    get<any[]>(`/reports/daily?branchId=${branchId}&days=${days}`),
}

export const menuApi = {
  items: () => get<any[]>('/menu?includeHidden=true'),
  categories: () => get<any[]>('/menu/categories'),
  create: (body: unknown) => post<any>('/menu', body),
  update: (id: string, body: unknown) => patch<any>(`/menu/${id}`, body),
  delete: (id: string) => del<void>(`/menu/${id}`),
  adjustStock: (id: string, body: unknown) => post<any>(`/menu/${id}/stock/adjust`, body),
  createCat: (body: unknown) => post<any>('/menu/categories', body),
  updateCat: (id: string, body: unknown) => patch<any>(`/menu/categories/${id}`, body),
}

export const tableApi = {
  list: (branchId: string) => get<any[]>(`/tables/branch/${branchId}`),
  create: (branchId: string, body: unknown) => post<any>(`/tables/branch/${branchId}`, body),
  regenerateQr: (id: string) => patch<any>(`/tables/${id}/regenerate-qr`),
}

export const couponApi = {
  list: () => get<any[]>('/coupons'),
  create: (body: unknown) => post<any>('/coupons', body),
  toggle: (id: string, isActive: boolean) =>
    patch<any>(`/coupons/${id}/toggle`, { isActive }),
}

export const loyaltyApi = {
  tiers: () => get<any[]>('/loyalty/tiers'),
  members: (page = 1) => get<any>(`/loyalty/members?page=${page}`),
  getByPhone: (phone: string) => get<any>(`/loyalty/account/${phone}`),
}

export const branchApi = {
  settings: (branchId: string) => get<any>(`/branches/${branchId}/settings`),
  update: (branchId: string, body: unknown) =>
    patch<any>(`/branches/${branchId}/settings`, body),
}

export const reportApi = {
  daily: (branchId: string, days: number) =>
    get<any[]>(`/reports/daily?branchId=${branchId}&days=${days}`),
  topItems: (branchId: string, days: number) =>
    get<any[]>(`/reports/top-items?branchId=${branchId}&days=${days}`),
  shifts: (branchId: string) =>
    get<any[]>(`/reports/shifts?branchId=${branchId}`),
}