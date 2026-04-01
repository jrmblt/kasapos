export interface BackofficeUser {
  id: string
  name: string
  role: string
  branchId: string | null
  tenantId: string
}

export interface DashboardStats {
  todayRevenue: number
  todayOrders: number
  activeOrders: number
  lowStockItems: number
  revenueByHour: { hour: string; revenue: number }[]
  topItems: { name: string; qty: number; revenue: number }[]
  recentOrders: RecentOrder[]
}

export interface RecentOrder {
  id: string
  tableId: string | null
  status: string
  total: number
  createdAt: string
  table: { name: string } | null
  itemCount: number
}

export interface MenuItemFull {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isAvailable: boolean
  stockQty: number | null
  stockAlert: number | null
  tags: string[]
  sortOrder: number
  category: { id: string; name: string }
  modifiers: ModifierFull[]
}

export interface ModifierFull {
  id: string
  name: string
  type: 'SINGLE_SELECT' | 'MULTI_SELECT'
  isRequired: boolean
  options: { name: string; priceAdd: number }[]
  sortOrder: number
}

export interface Category {
  id: string
  name: string
  nameEn: string | null
  sortOrder: number
  isActive: boolean
}

export interface TableFull {
  id: string
  name: string
  zone: string | null
  capacity: number
  status: string
  qrToken: string | null
}

export interface BranchSettings {
  id: string
  name: string
  selfOrderEnabled: boolean
  payLaterEnabled: boolean
  payAtCounterEnabled: boolean
  payOnlineEnabled: boolean
  queueEnabled: boolean
  queueDisplayName: boolean
  loyaltyEnabled: boolean
  taxRate: number
}

export interface CouponFull {
  id: string
  code: string
  name: string
  type: string
  targetType: string
  value: number
  minOrderAmt: number | null
  maxDiscountAmt: number | null
  usageLimit: number | null
  usagePerMember: number | null
  usedCount: number
  isActive: boolean
  startsAt: string | null
  expiresAt: string | null
  tier: { name: string; color: string } | null
}

export interface LoyaltyTier {
  id: string
  name: string
  minPoints: number
  multiplier: number
  color: string | null
  sortOrder: number
}

export interface MemberAccount {
  id: string
  phone: string
  name: string | null
  points: number
  totalEarned: number
  totalSpend: number
  visitCount: number
  lastVisitAt: string | null
  tier: { name: string; color: string } | null
}

export interface SalesReport {
  period: string
  revenue: number
  orders: number
  avgOrderValue: number
}