import type { Page } from '@playwright/test';
import {
  AUTH_SESSION_HINT_KEY,
  PREF_LANGUAGE_KEY,
  PREF_SIDEBAR_COLLAPSED_KEY,
  PREF_THEME_KEY,
  SPLASH_FIRST_SHOWN_KEY,
} from '../../../src/utils/browserStorageKeys';

export type TestLanguage = 'en' | 'hu';
export type TestTheme = 'light' | 'dark';

interface PrimeBrowserStateOptions {
  readonly language?: TestLanguage;
  /** `'system'` saves no theme, so the app follows the system color scheme. */
  readonly theme?: TestTheme | 'system';
  readonly sessionHint?: boolean;
  readonly sidebarCollapsed?: boolean;
  /** Default true: the browser counts as past its first splash, so loads keep the 250 ms minimum. Pass false to test the first load. */
  readonly splashShown?: boolean;
}

/** Marks the browser as past its first splash, so a spec is not slowed by the 2500 ms intro. */
export async function seedSplashShown(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    localStorage.setItem(key, '1');
  }, SPLASH_FIRST_SHOWN_KEY);
}

/** Preloads deterministic browser state before the app boots: language, theme, sidebar state,
 * the session hint that makes the app restore a session, and the splash-shown flag. */
export async function primeBrowserState(page: Page, options: PrimeBrowserStateOptions = {}): Promise<void> {
  const {
    language = 'en',
    theme = 'light',
    sessionHint = false,
    sidebarCollapsed = false,
    splashShown = true,
  } = options;

  if (splashShown) {
    await seedSplashShown(page);
  }

  await page.addInitScript((state: {
    language: TestLanguage;
    theme: TestTheme | 'system';
    sessionHint: boolean;
    sidebarCollapsed: boolean;
    keys: { language: string; sidebar: string; theme: string; hint: string };
  }) => {
    localStorage.setItem(state.keys.language, state.language);
    localStorage.setItem(state.keys.sidebar, state.sidebarCollapsed ? 'true' : 'false');

    if (state.theme === 'system') {
      localStorage.removeItem(state.keys.theme);
    } else {
      localStorage.setItem(state.keys.theme, state.theme);
    }

    if (state.sessionHint) {
      localStorage.setItem(state.keys.hint, '1');
    } else {
      localStorage.removeItem(state.keys.hint);
    }
  }, {
    language,
    theme,
    sessionHint,
    sidebarCollapsed,
    keys: {
      language: PREF_LANGUAGE_KEY,
      sidebar: PREF_SIDEBAR_COLLAPSED_KEY,
      theme: PREF_THEME_KEY,
      hint: AUTH_SESSION_HINT_KEY,
    },
  });
}

/** Storage entries to plant before the app boots. */
interface StorageSeed {
  readonly local?: Readonly<Record<string, string>>;
  readonly session?: Readonly<Record<string, string>>;
}

/** Plants raw storage entries on the first document load of the tab only, so a reload sees what the app saved itself. */
export async function seedStorageOnce(page: Page, seed: StorageSeed): Promise<void> {
  await page.addInitScript((entries: { local: Record<string, string>; session: Record<string, string> }) => {
    if (sessionStorage.getItem('e2e.seeded') !== null) {
      return;
    }

    sessionStorage.setItem('e2e.seeded', '1');
    for (const [key, value] of Object.entries(entries.local)) {
      localStorage.setItem(key, value);
    }
    for (const [key, value] of Object.entries(entries.session)) {
      sessionStorage.setItem(key, value);
    }
  }, { local: { ...seed.local }, session: { ...seed.session } });
}
