import { expect, test } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

test.describe('Auth and role route guards', () => {
  test('redirects to login when stored session hint is invalid', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'mechanic.edge@example.test',
      isAuthenticated: false,
    });

    await page.goto('/customers');

    await expect(page).toHaveURL(/\/login$/);
    const sessionHint = await page.evaluate(() => localStorage.getItem('autoservice-session-hint'));
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
});
