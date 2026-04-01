"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authApi, setAccessToken } from "@/app/lib/api";
import type { PosUser } from "@/app/lib/types";

interface PosAuthState {
  user: PosUser | null;
  accessToken: string; // ← เพิ่ม persist token ด้วย
  hydrated: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, pin: string) => Promise<boolean>;
  logout: () => void;
  _setHydrated: () => void;
}

export const usePosAuth = create<PosAuthState>()(
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
          set({
            user: res.user,
            accessToken: res.accessToken, // ← เก็บไว้ด้วย
            loading: false,
            error: null,
          });
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
      name: "kasa-pos-session",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage,
      ),
      // persist ทั้ง user และ accessToken
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        // restore token กลับเข้า memory ทันทีที่ hydrate
        if (state?.accessToken) {
          setAccessToken(state.accessToken);
        }
        state?._setHydrated();
      },
    },
  ),
);
