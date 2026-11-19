import type { Page } from '@playwright/test';

/** Tells the query client the tab was focused again, which re-reads every stale query that has no data. */
export async function refocusTab(page: Page): Promise<void> {
  await page.evaluate(() => {
    globalThis.dispatchEvent(new Event('visibilitychange'));
  });
}
