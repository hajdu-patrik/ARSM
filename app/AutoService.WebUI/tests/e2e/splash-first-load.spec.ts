/** The long splash shows on a first load that was not cut short and on a hard reload; a normal reload keeps the short one. */
import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { CUSTOMERS_ROUTE } from './support/app-routes';
import { primeBrowserState } from './support/browser-state';
import {
  FIRST_LOAD_SPLASH_MIN_MS,
  readSplashTrace,
  REPEAT_LOAD_SPLASH_MIN_MS,
  splashDurationMs,
  traceSplash,
} from './support/splash-trace';
import { hardReload } from './support/warm-cache';

/** Timer granularity slack for the splash minimum, which the app counts from its first render. */
const TIMER_SLACK_MS = 100;

/** A short splash is far below the 2500 ms intro even on a slow runner. */
const MAX_SHORT_SPLASH_MS = 2000;

const SIGNED_IN_MOCKS = { profileEmail: 'route.check@example.test', isAuthenticated: true, isAdmin: true };

/** A browser that already showed the intro, with the splash traced; `warmCache` false is a cleared cache. */
async function openPastFirstSplash(page: Page, warmCache: boolean): Promise<void> {
  await primeBrowserState(page, { sessionHint: true, warmCache });
  await installApiMocks(page, SIGNED_IN_MOCKS);
  await traceSplash(page);
}

/** Waits until the customers page is up and the splash is gone, then returns how long the splash was visible. */
async function readFinishedSplashMs(page: Page): Promise<number> {
  await expect(CUSTOMERS_ROUTE.ready(page)).toBeVisible();
  await expect(page.locator('#root .arsm-loading-logo-halo')).toHaveCount(0);

  return splashDurationMs(await readSplashTrace(page));
}

test('a first load reloaded while its splash is still up keeps the 2500 ms splash on the next load', async ({ page }) => {
  await primeBrowserState(page, { sessionHint: true, splashShown: false });
  await installApiMocks(page, SIGNED_IN_MOCKS);
  await traceSplash(page);

  await page.goto(CUSTOMERS_ROUTE.path);
  await expect(page.locator('#root .arsm-loading-logo-halo')).toBeVisible();

  await page.reload();
  const reloadMs = await readFinishedSplashMs(page);

  expect(reloadMs, 'the cut-short first load already counted as shown').toBeGreaterThanOrEqual(
    FIRST_LOAD_SPLASH_MIN_MS - TIMER_SLACK_MS,
  );
});

test.describe('Splash after the first load', () => {
  test('a normal reload keeps the short splash and a hard reload shows the 2500 ms splash again', async ({ page }) => {
    await openPastFirstSplash(page, true);

    await page.goto(CUSTOMERS_ROUTE.path);
    const loadMs = await readFinishedSplashMs(page);

    expect(loadMs, 'a load from a warm cache repeated the long splash').toBeLessThan(MAX_SHORT_SPLASH_MS);
    expect(loadMs, 'the short splash only flickered').toBeGreaterThanOrEqual(REPEAT_LOAD_SPLASH_MIN_MS - TIMER_SLACK_MS);

    await page.reload();
    const reloadMs = await readFinishedSplashMs(page);

    expect(reloadMs, 'a normal reload repeated the long splash').toBeLessThan(MAX_SHORT_SPLASH_MS);

    await hardReload(page);
    const hardReloadMs = await readFinishedSplashMs(page);

    expect(hardReloadMs, 'a hard reload did not show the long splash').toBeGreaterThanOrEqual(
      FIRST_LOAD_SPLASH_MIN_MS - TIMER_SLACK_MS,
    );

    await page.reload();
    const afterMs = await readFinishedSplashMs(page);

    expect(afterMs, 'the reload after a hard reload kept the long splash').toBeLessThan(MAX_SHORT_SPLASH_MS);
  });

  test('a load whose entry module came over the network shows the 2500 ms splash although the intro was seen', async ({ page }) => {
    // A cleared cache: nothing is served from it, so the entry module arrives with its full body.
    await openPastFirstSplash(page, false);

    await page.goto(CUSTOMERS_ROUTE.path);
    const coldMs = await readFinishedSplashMs(page);

    expect(coldMs, 'a load after a cleared cache kept the short splash').toBeGreaterThanOrEqual(
      FIRST_LOAD_SPLASH_MIN_MS - TIMER_SLACK_MS,
    );
  });

  test('a browser without resource timing entries keeps the short splash', async ({ page }) => {
    await openPastFirstSplash(page, false);
    await page.addInitScript(() => {
      performance.getEntriesByType = (): PerformanceEntryList => [];
    });

    await page.goto(CUSTOMERS_ROUTE.path);
    const unknownMs = await readFinishedSplashMs(page);

    expect(unknownMs, 'an unknown load source showed the long splash').toBeLessThan(MAX_SHORT_SPLASH_MS);
  });
});
