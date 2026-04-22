import { expect, test } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { SidebarPage } from './pages/sidebar.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Logout flow', () => {
  test.beforeEach(async ({ page }) => {
    await initBrowserState(page);
  });

  test('logout from sidebar clears session and redirects to /login', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    const schedulerPage = new SchedulerPage(page);
    await schedulerPage.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.clickLogout();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('after logout, visiting / redirects back to /login', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    const sidebar = new SidebarPage(page);
    await sidebar.clickLogout();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
