import { expect, test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CustomersPage } from './pages/customers.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import { MOCK_CUSTOMER_IDS } from './support/test-data';
import { primeBrowserState } from './support/browser-state';
import { getTokenLikeStorageKeys } from './support/token-storage';

test.describe('Auth session security flows', () => {
  // Tall enough that the page-size-by-height customers list shows Anna's card on page 1.
  test.use({ viewport: { width: 1280, height: 1000 } });

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
    // The heading renders from the shell before the retry settles; wait on the customer card
    // instead, which only appears once the retried request has succeeded.
    await expect(new CustomersPage(page).customerCard(MOCK_CUSTOMER_IDS.anna)).toBeVisible();

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

    await page.getByRole('button', { name: /Log out|Kijelentkezés/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    const sessionHint = await page.evaluate(() => localStorage.getItem('autoservice-session-hint'));
    expect(sessionHint).toBeNull();
    expect(await getTokenLikeStorageKeys(page)).toEqual([]);
  });
});