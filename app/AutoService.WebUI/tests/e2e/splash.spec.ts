/** The loading splash shows on a full load of every app route, only while the app loads, and leaves a
 * clickable page behind - also when the user prefers reduced motion (an earlier regression broke that). */
import { setTimeout as sleep } from 'node:timers/promises';
import { expect, test, type Page } from '@playwright/test';
import { APP_ROUTE_CHECKS, CUSTOMERS_ROUTE, prepareAppRoute, type AppRouteCheck } from './support/app-routes';
import { isReachableByPointer, readSplashTrace, splashDurationMs, traceSplash } from './support/splash-trace';

const MOTION_PREFERENCES = ['no-preference', 'reduce'] as const;

/** The old splash held every full load for a fixed 3000 ms; a fast load must clear it well before that. */
const MAX_FAST_SPLASH_MS = 2000;

/** Anti-flash minimum of the splash (150-300 ms by contract), with slack for timer granularity. */
const MIN_SPLASH_MS = 150;

/** Delay of the session check in the readiness test: long enough to tell "until ready" from any fixed time. */
const SESSION_CHECK_DELAY_MS = 1200;
const MAX_DELAYED_SPLASH_MS = 2500;

/** Waits for the page behind the splash, then proves no overlay is left: the splash is gone from the DOM,
 * its static first frame too, and a control answers a real click. */
async function expectSplashHandedOver(page: Page, route: AppRouteCheck): Promise<void> {
  await expect(route.ready(page)).toBeVisible();
  await expect(page.locator('#root .arsm-loading-logo-halo')).toHaveCount(0);
  await expect(page.locator('#login-shell')).toHaveCount(0);

  const themeToggle = page.getByTestId('theme-mode-toggle');
  expect(await isReachableByPointer(themeToggle), 'an overlay still covers the page').toBe(true);

  await themeToggle.click({ timeout: 2000 });
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
}

for (const motion of MOTION_PREFERENCES) {
  test.describe(`Loading splash (reduced motion: ${motion})`, () => {
    for (const route of APP_ROUTE_CHECKS) {
      test(`${route.name}: shows on a full load, leaves once the app is ready and the page is clickable`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: motion });
        await traceSplash(page);
        await prepareAppRoute(page, route);

        await page.goto(route.path);
        await expectSplashHandedOver(page, route);

        const trace = await readSplashTrace(page);
        const visibleMs = splashDurationMs(trace);

        expect(trace.coversViewport, 'the splash must cover the viewport').toBe(true);
        expect(trace.hasSolidBackground, 'the splash must have a solid background').toBe(true);
        expect(visibleMs, 'a fast load still waited for the old fixed 3 s').toBeLessThan(MAX_FAST_SPLASH_MS);
        expect(visibleMs, 'the splash only flickered').toBeGreaterThanOrEqual(MIN_SPLASH_MS);
      });
    }

    test('stays until the session check has answered, then goes', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await traceSplash(page);
      await prepareAppRoute(page, CUSTOMERS_ROUTE);
      // Registered after the mocks, so it wins; the delayed request then falls through to the mock.
      await page.route('**/api/auth/validate', async (validateRoute) => {
        await sleep(SESSION_CHECK_DELAY_MS);
        await validateRoute.fallback();
      });

      await page.goto(CUSTOMERS_ROUTE.path);
      await expectSplashHandedOver(page, CUSTOMERS_ROUTE);

      const visibleMs = splashDurationMs(await readSplashTrace(page));

      expect(visibleMs, 'the splash left before the session check answered').toBeGreaterThanOrEqual(SESSION_CHECK_DELAY_MS - 100);
      expect(visibleMs, 'the splash outlasted the session check by far').toBeLessThan(MAX_DELAYED_SPLASH_MS);
    });
  });
}
