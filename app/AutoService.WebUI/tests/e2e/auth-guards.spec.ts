import { expect, test } from '@playwright/test';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Route guards', () => {
  test.beforeEach(async ({ page }) => {
    await initBrowserState(page);
  });

  test('unauthenticated user visiting / is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user visiting /settings is redirected to /login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user visiting /admin/register is redirected to /login', async ({ page }) => {
    await page.goto('/admin/register');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user visiting /login is redirected to /', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    await page.goto('/login');
    await expect(page).toHaveURL(/\/$/);
  });

  test('/scheduler alias redirects to /', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    await page.goto('/scheduler');
    await expect(page).toHaveURL(/\/$/);
  });

  test('/dashboard alias redirects to /', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/$/);
  });

  test('authenticated non-admin visiting /admin/register is redirected to /', async ({ page }) => {
    // AdminRoute redirects unauthenticated users to /login and authenticated
    // non-admin users to /. This test verifies the non-admin branch: a regular
    // mechanic (who IS authenticated but does NOT have isAdmin) must land on /
    // rather than /login after navigating to the admin-only page.
    const env = getAppointmentFlowEnv();
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    await page.goto('/admin/register');
    await expect(page).toHaveURL(/^\/$/, { timeout: 10_000 });
  });
});
