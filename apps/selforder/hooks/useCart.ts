import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/lib/types'

interface CartStore {
  items: CartItem[]
  tableId: string | null
  sessionId: string | null
  branchId: string | null
  tenantId: string | null

  setContext: (ctx: { tableId: string; branchId: string; tenantId: string; sessionId?: string }) => void
  addItem: (item: Omit<CartItem, 'cartKey'>) => void
  updateQty: (cartKey: string, qty: number) => void
  removeItem: (cartKey: string) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      sessionId: null,
      branchId: null,
      tenantId: null,

      setContext: (ctx) => set(ctx),

      addItem: (item) => {
        const cartKey = `${item.menuItemId}::${JSON.stringify(item.modifiers)}`
        const existing = get().items.find(i => i.cartKey === cartKey)
        if (existing) {
          set(s => ({
            items: s.items.map(i =>
              i.cartKey === cartKey ? { ...i, qty: i.qty + item.qty } : i
            )
          }))
        } else {
          set(s => ({ items: [...s.items, { ...item, cartKey }] }))
        }
      },

      updateQty: (cartKey, qty) => {
        if (qty <= 0) { get().removeItem(cartKey); return }
        set(s => ({
          items: s.items.map(i => i.cartKey === cartKey ? { ...i, qty } : i)
        }))
      },

      removeItem: (cartKey) =>
        set(s => ({ items: s.items.filter(i => i.cartKey !== cartKey) })),

      clearCart: () =>
        set({ items: [], tableId: null, sessionId: null, branchId: null, tenantId: null }),

      total: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      itemCount: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    {
      name: 'kasa-cart',
      // clear cart เมื่อ token เปลี่ยน (โต๊ะใหม่)
      partialize: (s) => ({
        items: s.items,
        tableId: s.tableId,
        branchId: s.branchId,
        tenantId: s.tenantId,
        sessionId: s.sessionId,
      }),
    }
  )
)