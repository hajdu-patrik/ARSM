/** Theme store: follows the system color scheme until the user picks a theme, then the saved choice wins.
 * The theme is applied through the `dark` class on the root element. */

import { create } from 'zustand';
import { readStorage, writeStorage } from '../utils/safeStorage';

/** Supported application themes. */
type Theme = 'light' | 'dark';

/** Local storage key of the saved theme choice; index.html's pre-paint script reads the same key. */
const THEME_STORAGE_KEY = 'preferred-theme';

/** Media query that matches while the system color scheme is dark. */
const SYSTEM_DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** Applies the given theme to the DOM by toggling the `dark` class on the root element. */
function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/** The theme the user picked earlier, or null while the system color scheme still decides. */
function readSavedTheme(): Theme | null {
  const savedTheme = readStorage('local', THEME_STORAGE_KEY);
  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : null;
}

/** The theme that matches the system color scheme right now. */
function readSystemTheme(): Theme {
  return globalThis.matchMedia(SYSTEM_DARK_SCHEME_QUERY).matches ? 'dark' : 'light';
}

/** Shape of the theme Zustand store. */
interface ThemeState {
  /** Currently active theme. */
  theme: Theme;
  /** Whether the user picked a theme; until then the system color scheme decides. */
  hasChosenTheme: boolean;
  /** Toggles between light and dark mode, persisting the choice. */
  toggleTheme: () => void;
  /** Sets a specific theme, persisting the choice. */
  setTheme: (theme: Theme) => void;
  /** Loads the saved theme (else the system one) and applies it. */
  loadTheme: () => void;
}

/** Zustand store for theme state; initialized at module load time via {@link loadTheme}. */
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  hasChosenTheme: false,

  toggleTheme: () => {
    get().setTheme(get().theme === 'light' ? 'dark' : 'light');
  },

  setTheme: (theme) => {
    writeStorage('local', THEME_STORAGE_KEY, theme);
    applyThemeToDocument(theme);
    set({ theme, hasChosenTheme: true });
  },

  loadTheme: () => {
    const savedTheme = readSavedTheme();
    const theme = savedTheme ?? readSystemTheme();

    applyThemeToDocument(theme);
    set({ theme, hasChosenTheme: savedTheme !== null });
  },
}));

/** Follows system color scheme changes until the user picks a theme; a picked theme is never overridden. */
function followSystemColorScheme(): void {
  globalThis.matchMedia(SYSTEM_DARK_SCHEME_QUERY).addEventListener('change', (event) => {
    if (useThemeStore.getState().hasChosenTheme) {
      return;
    }

    const theme: Theme = event.matches ? 'dark' : 'light';
    applyThemeToDocument(theme);
    useThemeStore.setState({ theme });
  });
}

// Load theme on app start
useThemeStore.getState().loadTheme();
followSystemColorScheme();
