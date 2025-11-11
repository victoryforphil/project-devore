import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DarkModeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (isDark: boolean) => void;
}

export const useDarkMode = create<DarkModeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggle: () =>
        set((state) => {
          const newIsDark = !state.isDark;
          if (typeof document !== 'undefined') {
            if (newIsDark) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          return { isDark: newIsDark };
        }),
      setDark: (isDark) => {
        if (typeof document !== 'undefined') {
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        set({ isDark });
      },
    }),
    {
      name: 'dark-mode-storage',
    }
  )
);

