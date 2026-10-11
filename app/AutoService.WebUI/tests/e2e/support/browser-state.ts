import type { Page } from '@playwright/test';

export type TestLanguage = 'en' | 'hu';
export type TestTheme = 'light' | 'dark';

interface PrimeBrowserStateOptions {
  readonly language?: TestLanguage;
  /** `'system'` saves no theme, so the app follows the system color scheme. */
  readonly theme?: TestTheme | 'system';
  readonly sessionHint?: boolean;
  readonly sidebarCollapsed?: boolean;
}

/** Preloads deterministic localStorage state before the app boots: language, theme, sidebar
 * state and the session hint that makes the app restore a session. */
export async function primeBrowserState(page: Page, options: PrimeBrowserStateOptions = {}): Promise<void> {
  const {
    language = 'en',
    theme = 'light',
    sessionHint = false,
    sidebarCollapsed = false,
  } = options;

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
