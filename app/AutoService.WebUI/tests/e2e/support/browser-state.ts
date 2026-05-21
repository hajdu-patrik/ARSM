import type { Page } from '@playwright/test';

export type TestLanguage = 'en' | 'hu';
export type TestTheme = 'light' | 'dark';

interface PrimeBrowserStateOptions {
  readonly language?: TestLanguage;
  readonly theme?: TestTheme;
  readonly sessionHint?: boolean;
  readonly sidebarCollapsed?: boolean;
}

/**
 * Preloads deterministic localStorage state before the app boots.
 * This avoids loading-splash delays and keeps auth-route tests stable.
 */
export async function primeBrowserState(page: Page, options: PrimeBrowserStateOptions = {}): Promise<void> {
  const {
    language = 'en',
    theme = 'light',
    sessionHint = false,
    sidebarCollapsed = false,
  } = options;

  await page.addInitScript((state: {
    language: TestLanguage;
    theme: TestTheme;
    sessionHint: boolean;
    sidebarCollapsed: boolean;
  }) => {
    localStorage.setItem('preferred-language', state.language);
    localStorage.setItem('preferred-theme', state.theme);
    localStorage.setItem('loading-page-seen', 'true');
    localStorage.setItem('preferred-sidebar-collapsed', state.sidebarCollapsed ? 'true' : 'false');

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
