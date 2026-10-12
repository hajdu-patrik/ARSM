import type { Page } from '@playwright/test';

export type TestLanguage = 'en' | 'hu';
export type TestTheme = 'light' | 'dark';

/** localStorage flag the app sets once the browser showed its first splash (the 2500 ms intro). */
export const SPLASH_SHOWN_STORAGE_KEY = 'arsm-splash-shown';

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
  }, SPLASH_SHOWN_STORAGE_KEY);
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
  }) => {
    localStorage.setItem('preferred-language', state.language);
    localStorage.setItem('preferred-sidebar-collapsed', state.sidebarCollapsed ? 'true' : 'false');

    if (state.theme === 'system') {
      localStorage.removeItem('preferred-theme');
    } else {
      localStorage.setItem('preferred-theme', state.theme);
    }

    if (state.sessionHint) {
      localStorage.setItem('autoservice-session-hint', '1');
    } else {
      localStorage.removeItem('autoservice-session-hint');
    }
  }, {
    language,
    theme,
    sessionHint,
    sidebarCollapsed,
  });
}
