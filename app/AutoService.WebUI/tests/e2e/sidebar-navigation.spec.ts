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

  test('sidebar shows scheduler, tools, inventory nav items', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.expectNavItemVisible('Scheduler');
    await sidebar.expectNavItemVisible('Tools');
    await sidebar.expectNavItemVisible('Inventory');
  });

  test('navigate to settings via sidebar', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.clickNavItem('Settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('navigate to tools page via sidebar', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.clickNavItem('Tools');
    await expect(page).toHaveURL(/\/tools/);
  });

  test('navigate to inventory page via sidebar', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.clickNavItem('Inventory');
    await expect(page).toHaveURL(/\/inventory/);
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
});

test.describe('Sidebar navigation – admin user', () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminFlowEnv();
    test.skip(!admin, 'Admin credentials not configured');
    await initBrowserState(page);
    await loginAsMechanic(page, admin!.adminEmail, admin!.adminPassword);
  });

  test('admin sees admin nav item in sidebar', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.expectNavItemVisible('Admin');
  });
});
