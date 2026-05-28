import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

const tokenStorageKeyPattern = /token|jwt|access|refresh/i;

/** Reads storage keys that would indicate forbidden client-side token persistence. */
async function getTokenLikeStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate((patternSource) => {
    const pattern = new RegExp(patternSource, 'i');
    const keys = [
      ...Object.keys(localStorage),
      ...Object.keys(sessionStorage),
    ];

    return keys.filter((key) => pattern.test(key));
  }, tokenStorageKeyPattern.source);
}

test.describe('Auth session security flows', () => {
  test('refreshes once and retries a protected request after an expired access cookie', async ({ page }) => {
    const routeCallLog: string[] = [];

    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'mechanic.refresh@example.test',
      isAuthenticated: true,
      routeCallLog,
      unauthorizedOnceRouteKeys: ['GET /api/customers'],
    });

    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();

    expect(routeCallLog.filter((routeKey) => routeKey === 'POST /api/auth/refresh').length).toBeGreaterThanOrEqual(1);
    expect(routeCallLog.filter((routeKey) => routeKey === 'GET /api/customers').length).toBeGreaterThanOrEqual(2);
  });

  test('clears the session hint when refresh fails during a protected request retry', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'mechanic.refresh-fail@example.test',
      isAuthenticated: true,
      refreshShouldFail: true,
      unauthorizedOnceRouteKeys: ['GET /api/customers'],
    });

    await page.goto('/customers');

    await expect(page).toHaveURL(/\/login$/);
    const sessionHint = await page.evaluate(() => localStorage.getItem('autoservice-session-hint'));
    expect(sessionHint).toBeNull();
  });

  test('does not persist token-like storage keys after login or logout', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail });
    await new AuthPage(page).loginAsMechanic(env);

    expect(await getTokenLikeStorageKeys(page)).toEqual([]);

    await page.getByRole('button', { name: /Logout|Kijelentkezés/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    const sessionHint = await page.evaluate(() => localStorage.getItem('autoservice-session-hint'));
    expect(sessionHint).toBeNull();
    expect(await getTokenLikeStorageKeys(page)).toEqual([]);
  });
});