import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => {
        set({ token });
        // Sync with cookie for Middleware/Server Components
        if (typeof document !== 'undefined') {
          document.cookie = `sherpa_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        }
      },
      logout: () => {
        set({ token: null });
        // Clear cookie
        if (typeof document !== 'undefined') {
          document.cookie = "sherpa_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      },
    }),
    {
      name: 'sherpa-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
