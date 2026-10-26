/** Two tabs of one browser share their cookies, so when both meet an expired session only one of them
 * refreshes it: the other waits for the cross-tab lock, sees the rotated CSRF cookie and just retries. */
import { setTimeout as sleep } from 'node:timers/promises';
import { expect, test, type Page } from '@playwright/test';
import { CustomersPage } from './pages/customers.page';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { MOCK_CUSTOMER_IDS } from './support/test-data';

/** How long the mocked refresh takes: long enough for the second tab to hit its 401 meanwhile. */
const REFRESH_DURATION_MS = 1500;

/** The CSRF cookie the API rotates on every refresh (host-scoped, so both tabs and the API origin share it). */
function csrfCookie(value: string, baseUrl: string) {
  return { name: '__Host-arsm-csrf-token', value, url: baseUrl, secure: true };
}

/** Signs the tab in with a session whose first customers read is refused once, and times its refresh. */
async function prepareExpiredSessionTab(page: Page, routeCallLog: string[], rotateCsrfCookie: () => Promise<void>): Promise<void> {
  await primeBrowserState(page, { sessionHint: true });
  await installApiMocks(page, {
    profileEmail: 'two.tabs@example.test',
    isAuthenticated: true,
    routeCallLog,
    unauthorizedOnceRouteKeys: ['GET /api/customers'],
  });
  // Registered after the mocks, so it wins: the refresh takes a while and then rotates the shared cookie.
  await page.route('**/api/auth/refresh', async (refreshRoute) => {
    await sleep(REFRESH_DURATION_MS);
    await rotateCsrfCookie();
    await refreshRoute.fallback();
  });
}

test.describe('Cross-tab session refresh', () => {
  // Tall enough that the page-size-by-height customers list shows Anna's card on page 1.
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('two tabs with an expired session refresh it once and both retry their request', async ({ page, context, baseURL }) => {
    const baseUrl = baseURL ?? '';
    const routeCallLog: string[] = [];
    let rotations = 0;
    const rotateCsrfCookie = async () => {
      rotations += 1;
      await context.addCookies([csrfCookie(`rotated-${String(rotations)}`, baseUrl)]);
    };
    await context.addCookies([csrfCookie('initial', baseUrl)]);
    const secondTab = await context.newPage();
    await prepareExpiredSessionTab(page, routeCallLog, rotateCsrfCookie);
    await prepareExpiredSessionTab(secondTab, routeCallLog, rotateCsrfCookie);

    await Promise.all([page.goto('/customers'), secondTab.goto('/customers')]);

    await expect(new CustomersPage(page).customerCard(MOCK_CUSTOMER_IDS.anna)).toBeVisible();
    await expect(new CustomersPage(secondTab).customerCard(MOCK_CUSTOMER_IDS.anna)).toBeVisible();
    expect(routeCallLog.filter((routeKey) => routeKey === 'POST /api/auth/refresh')).toHaveLength(1);
    expect(rotations).toBe(1);
  });
});
