"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authApi, setToken } from "@/lib/api";

interface AuthState {
  user: any | null;
  accessToken: string;
  hydrated: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, pin: string) => Promise<boolean>;
  logout: () => void;
  _setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
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
          setToken(res.accessToken);
          set({ user: res.user, accessToken: res.accessToken, loading: false });
          return true;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Login failed",
            loading: false,
          });
          return false;
        }
      },

      logout: () => {
        setToken("");
        set({ user: null, accessToken: "", error: null });
      },
    }),
    {
      name: "kasa-bo-session",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage,
      ),
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setToken(state.accessToken);
        state?._setHydrated();
      },
    },
  ),
);
