export interface MenuCategory {
  id: string
  name: string
  menuItems?: MenuItem[]
}

export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  isAvailable: boolean
  stockQty?: number | null
  tags: string[]
  modifiers: Modifier[]
  category: { id: string; name: string }
}

export interface Modifier {
  id: string
  name: string
  type: 'SINGLE_SELECT' | 'MULTI_SELECT'
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: { name: string; priceAdd: number }[]
}

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  qty: number
  modifiers: Record<string, string>   // { "ความเผ็ด": "เผ็ด" }
  note?: string
  cartKey: string
}

export interface MemberAccount {
  id: string
  phone: string
  name?: string
  points: number
  tier?: { name: string; color: string }
  visitCount: number
}

export interface BranchConfig {
  id: string
  tenantId: string
  name: string
  selfOrderEnabled: boolean
  payLaterEnabled: boolean
  payAtCounterEnabled: boolean
  payOnlineEnabled: boolean
  queueEnabled: boolean
  queueDisplayName: boolean
  loyaltyEnabled: boolean
}