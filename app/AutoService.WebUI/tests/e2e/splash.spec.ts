/** The loading splash shows on a full load of every app route, only while the app loads, and leaves a
 * clickable page behind - also when the user prefers reduced motion (an earlier regression broke that). */
import { setTimeout as sleep } from 'node:timers/promises';
import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { APP_ROUTE_CHECKS, CUSTOMERS_ROUTE, prepareAppRoute, type AppRouteCheck } from './support/app-routes';
import { primeBrowserState } from './support/browser-state';
import {
  FIRST_LOAD_SPLASH_MIN_MS,
  isReachableByPointer,
  readSplashTrace,
  REPEAT_LOAD_SPLASH_MIN_MS,
  splashDurationMs,
  traceSplash,
} from './support/splash-trace';

const MOTION_PREFERENCES = ['no-preference', 'reduce'] as const;

/** The old splash held every full load for a fixed 3000 ms; a fast load must clear it well before that. */
const MAX_FAST_SPLASH_MS = 2000;

/** Timer granularity slack for the splash minimums, which the app counts from its first render. */
const TIMER_SLACK_MS = 100;

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
        expect(visibleMs, 'the splash only flickered').toBeGreaterThanOrEqual(REPEAT_LOAD_SPLASH_MIN_MS - TIMER_SLACK_MS);
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

test.describe('Loading splash minimum per browser', () => {
  test('only the first load ever holds the splash for 2500 ms; a reload and a new tab use the short minimum', async ({ page }) => {
    // No splash-shown flag: the browser is fresh, and the app sets the flag itself once it showed the splash.
    const mocks = { profileEmail: 'route.check@example.test', isAuthenticated: true, isAdmin: true };
    await primeBrowserState(page, { sessionHint: true, splashShown: false });
    await installApiMocks(page, mocks);
    await traceSplash(page);

    await page.goto(CUSTOMERS_ROUTE.path);
    await expectSplashHandedOver(page, CUSTOMERS_ROUTE);
    const firstLoadMs = splashDurationMs(await readSplashTrace(page));

    expect(firstLoadMs, 'the first load of the browser left the splash too early').toBeGreaterThanOrEqual(FIRST_LOAD_SPLASH_MIN_MS - TIMER_SLACK_MS);

    // The reload keeps the browser's localStorage, so it only waits for the anti-flash minimum.
    await page.reload();
    await expectSplashHandedOver(page, CUSTOMERS_ROUTE);
    const reloadMs = splashDurationMs(await readSplashTrace(page));

    expect(reloadMs, 'a reload repeated the long first-load splash').toBeLessThan(MAX_FAST_SPLASH_MS);
    expect(reloadMs, 'the reload splash only flickered').toBeGreaterThanOrEqual(REPEAT_LOAD_SPLASH_MIN_MS - TIMER_SLACK_MS);

    // A new tab has a fresh sessionStorage but shares localStorage, so it is not a first load either.
    const newTab = await page.context().newPage();
    await primeBrowserState(newTab, { sessionHint: true, splashShown: false });
    await installApiMocks(newTab, mocks);
    await traceSplash(newTab);

    await newTab.goto(CUSTOMERS_ROUTE.path);
    await expectSplashHandedOver(newTab, CUSTOMERS_ROUTE);
    const newTabMs = splashDurationMs(await readSplashTrace(newTab));

    expect(newTabMs, 'a new tab repeated the long first-load splash').toBeLessThan(MAX_FAST_SPLASH_MS);
    expect(newTabMs, 'the new tab splash only flickered').toBeGreaterThanOrEqual(REPEAT_LOAD_SPLASH_MIN_MS - TIMER_SLACK_MS);
  });
});

test.describe('Loading splash on non-app routes', () => {
  for (const path of ['/500', '/no-such-page']) {
    test(`${path} never shows the splash`, async ({ page }) => {
      await traceSplash(page);
      await primeBrowserState(page, { sessionHint: false });
      await installApiMocks(page, { profileEmail: 'route.check@example.test', isAuthenticated: false });

      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      expect((await readSplashTrace(page)).appearedAt).toBeNull();
    });
  }

  test('the load after a server-error retry skips the splash once', async ({ page }) => {
    await traceSplash(page);
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, { profileEmail: 'route.check@example.test', isAuthenticated: true });
    await page.goto('/500?returnTo=%2Fcustomers');

    await page.getByRole('button', { name: 'Reload page' }).click();

    await expect(CUSTOMERS_ROUTE.ready(page)).toBeVisible();
    expect((await readSplashTrace(page)).appearedAt).toBeNull();
  });
});
