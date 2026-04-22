import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { getAdminFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Admin – mechanic list', () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminFlowEnv();
    test.skip(!admin, 'Admin credentials not configured');
    await initBrowserState(page);
    await loginAsMechanic(page, admin!.adminEmail, admin!.adminPassword);
  });

  test('admin page loads with mechanic list', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    const heading = page.getByRole('heading', { level: 2 }).first();
    await expect(heading).toBeVisible();
  });

  test('mechanic list shows at least one entry', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    await page.waitForTimeout(2_000);
    const listItems = page.locator('[class*="flex"][class*="items-center"]')
      .filter({ has: page.locator('img, [class*="rounded-full"]') });
    const count = await listItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('delete button is hidden for admin accounts', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    await page.waitForTimeout(2_000);
    const admin = getAdminFlowEnv()!;
    const adminRow = page.locator('div').filter({ hasText: admin.adminEmail }).first();
    const isRowVisible = await adminRow.isVisible().catch(() => false);

    if (isRowVisible) {
      const deleteBtn = adminRow.getByRole('button', { name: /delete|remove/i });
      const deleteVisible = await deleteBtn.isVisible().catch(() => false);
      expect(deleteVisible).toBe(false);
    }
  });

  test('non-admin mechanic has visible delete button', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    await page.waitForTimeout(2_000);
    const deleteButtons = page.getByRole('button', { name: /delete|remove/i });
    const hasDelete = (await deleteButtons.count()) > 0;

    expect(hasDelete).toBe(true);
  });
});
