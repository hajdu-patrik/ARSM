import { create } from 'zustand';

type Theme = 'light' | 'dark';

function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', theme === 'dark');
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  loadTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('preferred-theme', newTheme);
      applyThemeToDocument(newTheme);
      return { theme: newTheme };
    }),

  setTheme: (theme) => {
    localStorage.setItem('preferred-theme', theme);
    applyThemeToDocument(theme);
    set({ theme });
  },

  loadTheme: () => {
    const savedTheme = localStorage.getItem('preferred-theme') as Theme | null;
    const prefersDark = (globalThis?.matchMedia?.('(prefers-color-scheme: dark)').matches) ?? false;
    const theme = savedTheme ?? (prefersDark ? 'dark' : 'light');
    applyThemeToDocument(theme);
    set({ theme });
  },
}));

// Load theme on app start
useThemeStore.getState().loadTheme();
