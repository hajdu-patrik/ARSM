import { expect, test } from '@playwright/test';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Not Found (404) page', () => {
  test('unauthenticated user on unknown route gets redirected to login', async ({ page }) => {
    await initBrowserState(page);
    await page.goto('/nonexistent-route-xyz');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('authenticated user sees 404 content on unknown route', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    await page.goto('/nonexistent-route-xyz');
    await page.waitForTimeout(1_000);

    const notFoundText = page.getByText(/404|not found|page.*not/i);
    const isVisible = await notFoundText.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('404 page shows countdown or redirect link', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    await page.goto('/this-does-not-exist');
    await page.waitForTimeout(1_000);

    const countdownOrLink = page.getByText(/redirect|second|go back|home/i);
    const isVisible = await countdownOrLink.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('404 page auto-redirects to home after countdown', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    await page.goto('/auto-redirect-test-route');

    await page.waitForURL(/^\/$/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/$/);
  });
});
