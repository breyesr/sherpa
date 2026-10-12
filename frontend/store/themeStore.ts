import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BrandTheme = 'trailhead' | 'block';

interface ThemeState {
  theme: BrandTheme;
  setTheme: (theme: BrandTheme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'trailhead',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'xerpa-brand-theme',
    }
  )
);
