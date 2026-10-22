import type { Page } from '@playwright/test';

/** Storage keys that would indicate forbidden client-side token persistence. */
export function getTokenLikeStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const keys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
    return keys.filter((key) => /token|jwt|access|refresh/i.test(key));
  });
}
