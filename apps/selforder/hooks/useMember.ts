import { create } from "zustand";
import { persist } from "zustand/middleware";
import { memberApi } from "@/lib/api";
import type { MemberAccount } from "@/lib/types";

interface MemberStore {
  account: MemberAccount | null;
  token: string | null;
  loading: boolean;

  setMember: (account: MemberAccount, token: string) => void;
  logout: () => void;
  hydrate: () => Promise<void>; // validate token on mount
}

export const useMember = create<MemberStore>()(
  persist(
    (set, get) => ({
      account: null,
      token: null,
      loading: false,

      setMember: (account, token) => set({ account, token }),

      logout: () => set({ account: null, token: null }),

      hydrate: async () => {
        const { token } = get();
        if (!token) return;
        set({ loading: true });
        try {
          const account = await memberApi.validateSession(token);
          set({ account, loading: false });
        } catch {
          set({ account: null, token: null, loading: false });
        }
      },
    }),
    { name: "kasa-member" },
  ),
);
