import type { Page } from '@playwright/test';

/** sessionStorage key that makes the next document of the tab skip the warm-cache emulation once. */
const HARD_RELOAD_KEY = 'e2e.hardReload';

/** Reports every resource as served from the browser cache (zero transfer), the way a normal reload or a later
 * visit looks. Playwright's routes switch the HTTP cache off, so without this every load would look cold. */
export async function emulateWarmCache(page: Page): Promise<void> {
  await page.addInitScript((hardReloadKey: string) => {
    if (sessionStorage.getItem(hardReloadKey) !== null) {
      sessionStorage.removeItem(hardReloadKey);
      return;
    }

    const readEntries = performance.getEntriesByType.bind(performance);

    performance.getEntriesByType = (type: string): PerformanceEntryList => readEntries(type).map((entry) => {
      if (type !== 'resource') {
        return entry;
      }

      return new Proxy(entry, {
        get: (target, property): unknown => (property === 'transferSize' ? 0 : Reflect.get(target, property, target)),
      });
    });
  }, HARD_RELOAD_KEY);
}

/** Emulates Ctrl+Shift+R: the HTTP cache is off (CDP) and the next document sees real transfer sizes. */
export async function hardReload(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.detach();

  await page.evaluate((hardReloadKey: string) => {
    sessionStorage.setItem(hardReloadKey, '1');
  }, HARD_RELOAD_KEY);
  await page.reload();
}
