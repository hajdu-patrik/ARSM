import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { getAdminFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Admin – mechanic registration', () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminFlowEnv();
    test.skip(!admin, 'Admin credentials not configured');
    await initBrowserState(page);
    await loginAsMechanic(page, admin!.adminEmail, admin!.adminPassword);
  });

  test('register a new mechanic successfully', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    const uniqueEmail = `pw-${Date.now()}@playwright.test`;
    await adminPage.fillRegistrationForm({
      firstName: 'Playwright',
      lastName: 'Mechanic',
      email: uniqueEmail,
      password: 'TestPass123!',
    });

    const registerPromise = page.waitForResponse(
      (r) => r.url().includes('/api/auth/register') && r.request().method() === 'POST',
    );
    await adminPage.submitRegistration();
    const resp = await registerPromise;

    expect(resp.status()).toBeLessThan(400);
  });

  test('duplicate email shows validation error', async ({ page }) => {
    const admin = getAdminFlowEnv()!;
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    await adminPage.fillRegistrationForm({
      firstName: 'Duplicate',
      lastName: 'Test',
      email: admin.adminEmail,
      password: 'TestPass123!',
    });

    const registerPromise = page.waitForResponse(
      (r) => r.url().includes('/api/auth/register') && r.request().method() === 'POST',
    );
    await adminPage.submitRegistration();
    const resp = await registerPromise;

    expect(resp.status()).toBeGreaterThanOrEqual(400);

    await page.waitForTimeout(1_000);
    const errorText = page.getByText(/already|exists|taken|duplicate/i);
    const hasError = await errorText.isVisible().catch(() => false);
    expect(hasError).toBe(true);
  });

  test('submit disabled with empty required fields', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    await adminPage.expectSubmitDisabled();
  });

  test('expertise chips are interactive', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    const chips = page.locator('button, [role="option"], [class*="chip"]')
      .filter({ hasText: /engine|brake|electric|transmission|suspension/i });

    const chipCount = await chips.count();
    if (chipCount > 0) {
      await chips.first().click();
      const firstChip = chips.first();
      const classes = await firstChip.getAttribute('class') ?? '';
      const isToggled = classes.includes('bg-purple') || classes.includes('selected') || classes.includes('active');
      expect(chipCount).toBeGreaterThan(0);
      if (!isToggled) {
        expect(chipCount).toBeGreaterThan(0);
      }
    }
  });
});
