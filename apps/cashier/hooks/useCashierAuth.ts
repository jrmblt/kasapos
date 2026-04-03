"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authApi, setAccessToken } from "@/lib/api";
import type { PosUser } from "@/lib/types";

interface AuthState {
  user: PosUser | null;
  accessToken: string;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, pin: string) => Promise<boolean>;
  logout: () => void;
  _setHydrated: () => void;
}

export const useCashierAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: "",
      hydrated: false,
      loading: false,
      error: null,

      _setHydrated: () => set({ hydrated: true }),

      login: async (email, pin) => {
        set({ loading: true, error: null });
        try {
          const res = await authApi.login(email, pin);
          setAccessToken(res.accessToken);
          set({ user: res.user, accessToken: res.accessToken, loading: false, error: null });
          return true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "เข้าสู่ระบบไม่ได้";
          set({ loading: false, error: msg });
          return false;
        }
      },

      logout: () => {
        setAccessToken("");
        set({ user: null, accessToken: "", error: null });
      },
    }),
    {
      name: "kasa-cashier-session",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage,
      ),
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
        state?._setHydrated();
      },
    },
  ),
);
