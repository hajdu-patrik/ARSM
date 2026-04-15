/**
 * Theme state store.
 *
 * Manages dark/light mode preference. The selected theme is persisted
 * in {@code localStorage} under the key {@code 'preferred-theme'} and
 * applied by toggling the {@code 'dark'} class on {@code document.documentElement}.
 * @module store/theme.store
 */

import { create } from 'zustand';

/** Supported application themes. */
type Theme = 'light' | 'dark';

/**
 * Applies the given theme to the DOM by toggling the {@code 'dark'} class
 * on the root {@code <html>} element.
 * @param theme - The theme to apply.
 */
function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/**
 * Shape of the theme Zustand store.
 */
interface ThemeState {
  /** Currently active theme. */
  theme: Theme;
  /** Toggles between light and dark mode, persisting the choice. */
  toggleTheme: () => void;
  /** Sets a specific theme, persisting the choice. */
  setTheme: (theme: Theme) => void;
  /** Loads the persisted theme from {@code localStorage} and applies it. */
  loadTheme: () => void;
}

/**
 * Zustand store for theme state.
 * Initialized at module load time via {@link loadTheme}.
 */
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
    const savedTheme = localStorage.getItem('preferred-theme');
    const theme: Theme = savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : 'light';

    applyThemeToDocument(theme);
    set({ theme });
  },
}));

// Load theme on app start
useThemeStore.getState().loadTheme();
