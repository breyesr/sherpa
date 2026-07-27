import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  setToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: async (token) => {
        set({ token });
        try {
          await fetch('/api/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, action: 'set' }),
          });
        } catch (err) {
          console.error('Failed to set auth cookie:', err);
        }
      },
      logout: async () => {
        set({ token: null });
        try {
          await fetch('/api/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'clear' }),
          });
        } catch (err) {
          console.error("Failed to clear auth cookie:", err);
        }
      },
    }),
    {
      name: 'sherpa-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
