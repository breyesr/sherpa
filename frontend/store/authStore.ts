import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { API_BASE_URL } from '@/config';

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => {
        set({ token });
        // Client-side document.cookie setting is removed as the backend
        // now sets a secure HttpOnly cookie automatically.
      },
      logout: async () => {
        set({ token: null });
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (err) {
          console.error("Failed to clear auth cookie on server:", err);
        }
      },
    }),
    {
      name: 'sherpa-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
