import { expect, test } from '@playwright/test';
import { SidebarPage } from './pages/sidebar.page';
import { SchedulerPage } from './pages/scheduler.page';
import { getAppointmentFlowEnv, getAdminFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Sidebar navigation – regular mechanic', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);
  });

  test('sidebar shows scheduler/customers and hides tools/inventory links', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.expectNavItemVisible('Scheduler');
    await sidebar.expectNavItemVisible('Customers');
    await sidebar.expectNavItemHidden('Tools');
    await sidebar.expectNavItemHidden('Inventory');
  });

  test('navigate to customers page via sidebar', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.clickNavItem('Customers');
    await expect(page).toHaveURL(/\/customers/);
  });

  test('navigate to settings via sidebar', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.clickNavItem('Settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('sidebar collapse persists after page reload', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.toggleCollapse();
    await page.waitForTimeout(500);

    const collapsedFlag = await page.evaluate(() => localStorage.getItem('preferred-sidebar-collapsed'));
    expect(collapsedFlag).toBeTruthy();

    await page.reload();
    await scheduler.expectLoaded();

    const flagAfter = await page.evaluate(() => localStorage.getItem('preferred-sidebar-collapsed'));
    expect(flagAfter).toBe(collapsedFlag);
  });

  test('removed tools and inventory routes now resolve to not found', async ({ page }) => {
    await page.goto('/tools');
    await expect(page.getByRole('heading', { name: /Page Not Found/i })).toBeVisible({ timeout: 10_000 });

    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /Page Not Found/i })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Sidebar navigation – admin user', () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminFlowEnv();
    test.skip(!admin, 'Admin credentials not configured');
    if (!admin) {
      return;
    }
    await initBrowserState(page);
    await loginAsMechanic(page, admin.adminEmail, admin.adminPassword);
  });

  test('admin sees admin nav item and can navigate to admin page', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.expectNavItemVisible('Admin');
    await sidebar.clickNavItem('Admin');
    await expect(page).toHaveURL(/\/admin\/register/);
  });
});
