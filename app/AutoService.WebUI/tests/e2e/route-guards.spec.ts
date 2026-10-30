import { expect, test } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

/** Every page behind the sign-in guard. */
const PRIVATE_PATHS = ['/', '/customers', '/quotes', '/inventory', '/company-results', '/settings', '/admin/register'];

test.describe('Auth and role route guards', () => {
  test('redirects to login when stored session hint is invalid', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'mechanic.edge@example.test',
      isAuthenticated: false,
    });

    await page.goto('/customers');

    await expect(page).toHaveURL(/\/login$/);
    const sessionHint = await page.evaluate(() => localStorage.getItem('arsm.auth.sessionHint'));
    expect(sessionHint).toBeNull();
  });

  test('redirects authenticated users away from login', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'mechanic.edge@example.test',
      isAuthenticated: true,
    });

    await page.goto('/login');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
  });

  test('blocks non-admin users from admin register page', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'mechanic.edge@example.test',
      isAuthenticated: true,
      isAdmin: false,
    });

    await page.goto('/admin/register');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
  });

  test('allows admin users to access admin register page', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'admin.edge@example.test',
      isAuthenticated: true,
      isAdmin: true,
    });

    await page.goto('/admin/register');

    await expect(page).toHaveURL(/\/admin\/register$/);
    await expect(page.locator('#reg-email')).toBeVisible();
  });

  test('keeps alias routes redirected to root scheduler route', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'mechanic.edge@example.test',
      isAuthenticated: true,
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/scheduler');
    await expect(page).toHaveURL(/\/$/);
  });

  test('sends a signed-out visitor from every private page to login, without a session check', async ({ page }) => {
    const routeCallLog: string[] = [];
    await primeBrowserState(page, { sessionHint: false });
    await installApiMocks(page, {
      profileEmail: 'mechanic.edge@example.test',
      isAuthenticated: false,
      routeCallLog,
    });

    for (const path of PRIVATE_PATHS) {
      await page.goto(path);
      await expect(page, `${path} must send a signed-out visitor to login`).toHaveURL(/\/login$/);
      await expect(page.locator('#identifier')).toBeVisible();
    }

    expect(routeCallLog).not.toContain('GET /api/auth/validate');
  });

  test('lets a signed-in mechanic reach every shared page and keeps admin pages closed', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'mechanic.edge@example.test',
      isAuthenticated: true,
      isAdmin: false,
    });

    for (const path of PRIVATE_PATHS.filter((candidate) => candidate !== '/admin/register')) {
      await page.goto(path);
      await expect(page, `${path} must stay reachable`).toHaveURL((url) => url.pathname === path);
    }

    await page.goto('/admin/register');
    await expect(page).toHaveURL(/\/$/);
  });

  test('ignores a trailing slash on a private page', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'mechanic.edge@example.test',
      isAuthenticated: true,
    });

    await page.goto('/customers/');

    await expect(page.getByTestId('customers-search-input')).toBeVisible();
  });
});
