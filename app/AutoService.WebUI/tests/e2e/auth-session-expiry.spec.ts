/** Session edge cases: the start-up validate (one refresh on 401, the login page when the refresh is rejected, the
 * /500 detour when the server fails), the refresh-and-retry of a refused write and a failing logout. */
import { expect, test } from '@playwright/test';
import { openSettings } from './pages/settings.page';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { toastMessage } from './support/toast';

const HINT_KEY = 'arsm.auth.sessionHint';

test.describe('Session check at start-up', () => {
  test('a failing validate keeps the hint, shows /500 and returns to the page once the server answers', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'validate.down@example.test',
      routeFailures: { 'GET /api/auth/validate': { status: 503, body: {} } },
    });

    await page.goto('/customers');

    await expect(page).toHaveURL(/\/500\?returnTo=%2Fcustomers$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)).toBe('1');
    await expect(page).toHaveURL(/\/customers$/, { timeout: 8000 });
    await expect(page.getByTestId('customers-search-input')).toBeVisible();
  });

  test('an unreachable server at start-up takes the same detour and keeps the hint', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'validate.unreachable@example.test',
      routeFailures: { 'GET /api/auth/validate': { abort: true } },
    });

    await page.goto('/quotes');

    await expect(page).toHaveURL(/\/500\?returnTo=%2Fquotes$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)).toBe('1');
  });

  test('an expired access cookie at start-up is refreshed once and the page opens', async ({ page }) => {
    const routeCallLog: string[] = [];
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'validate.expired@example.test',
      routeCallLog,
      unauthorizedOnceRouteKeys: ['GET /api/auth/validate'],
    });

    await page.goto('/customers');

    await expect(page.getByTestId('customers-search-input')).toBeVisible();
    await expect(page).toHaveURL(/\/customers$/);
    expect(routeCallLog.filter((routeKey) => routeKey === 'POST /api/auth/refresh')).toHaveLength(1);
    expect(routeCallLog.filter((routeKey) => routeKey === 'GET /api/auth/validate')).toHaveLength(2);
    expect(await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)).toBe('1');
  });

  test('a refused validate whose refresh also fails ends at the login page without the hint', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'validate.revoked@example.test',
      refreshShouldFail: true,
      unauthorizedOnceRouteKeys: ['GET /api/auth/validate'],
    });

    await page.goto('/customers');

    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)).toBeNull();
  });

  test('a refused validate whose refresh fails for a passing reason takes the /500 detour and keeps the hint', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'validate.refresh-down@example.test',
      routeFailures: { 'POST /api/auth/refresh': { status: 503, body: {} } },
      unauthorizedOnceRouteKeys: ['GET /api/auth/validate'],
    });

    await page.goto('/customers');

    await expect(page).toHaveURL(/\/500\?returnTo=%2Fcustomers$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)).toBe('1');
    await expect(page).toHaveURL(/\/customers$/, { timeout: 8000 });
    await expect(page.getByTestId('customers-search-input')).toBeVisible();
  });

  test('without a session hint no session check is sent at all', async ({ page }) => {
    const routeCallLog: string[] = [];
    await primeBrowserState(page, { sessionHint: false });
    await installApiMocks(page, { profileEmail: 'no.hint@example.test', routeCallLog });

    await page.goto('/customers');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('#identifier')).toBeVisible();
    expect(routeCallLog).not.toContain('GET /api/auth/validate');
  });
});

test.describe('Session during use', () => {
  test('a write refused with 401 is retried once after one refresh and then succeeds', async ({ page }) => {
    const routeCallLog: string[] = [];
    const { settings } = await openSettings(page, {
      routeCallLog,
      unauthorizedOnceRouteKeys: ['PUT /api/profile'],
    });
    await settings.firstName.fill('Retried');

    await settings.saveProfileButton().click();
    await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();

    await expect(toastMessage(page, 'Profile updated successfully.')).toBeVisible();
    expect(routeCallLog.filter((routeKey) => routeKey === 'PUT /api/profile')).toHaveLength(2);
    expect(routeCallLog.filter((routeKey) => routeKey === 'POST /api/auth/refresh')).toHaveLength(1);
  });

  test('a write whose refresh also fails ends the session at the login page', async ({ page }) => {
    const { settings } = await openSettings(page, {
      refreshShouldFail: true,
      unauthorizedOnceRouteKeys: ['PUT /api/profile'],
    });
    await settings.firstName.fill('Lost');

    await settings.saveProfileButton().click();
    await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)).toBeNull();
  });

  test('logging out ends the session locally even when the logout request is refused', async ({ page }) => {
    await openSettings(page, { routeFailures: { 'POST /api/auth/logout': { status: 401, body: {} } } });

    await page.locator('aside:visible').getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)).toBeNull();
  });

  test('a refused logout leaves no unhandled rejection (pageerror) and still lands on login', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await openSettings(page, { routeFailures: { 'POST /api/auth/logout': { status: 401, body: {} } } });
    const logoutResponse = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/auth/logout');

    await page.locator('aside:visible').getByRole('button', { name: 'Log out' }).click();

    expect((await logoutResponse).status()).toBe(401);
    await expect(page).toHaveURL(/\/login$/);
    // A browser round trip plus a short pause lets the asynchronous unhandled-rejection report arrive first.
    await page.evaluate(() => fetch('/').then(() => new Promise((resolve) => setTimeout(resolve, 300))));
    expect(pageErrors).toEqual([]);
    expect(await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)).toBeNull();
    await expect(page).toHaveURL(/\/login$/);
  });
});
