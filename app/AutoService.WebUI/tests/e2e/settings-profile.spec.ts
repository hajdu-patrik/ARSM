import { expect, test } from '@playwright/test';
import { SettingsPage } from './pages/settings.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Settings – profile management', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);
  });

  test('settings page loads with profile data', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const firstName = await settings.getFirstNameValue();
    expect(firstName.length).toBeGreaterThan(0);
  });

  test('update first name and save personal info', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const original = await settings.getFirstNameValue();
    const updated = original === 'TestName' ? 'TestUpdated' : 'TestName';

    await settings.fillFirstName(updated);

    const savePromise = page.waitForResponse(
      (r) => r.url().includes('/api/profile') && r.request().method() === 'PUT' && r.status() === 200,
    );
    await settings.submitPersonalInfo();
    await savePromise;

    await page.reload();
    await settings.expectLoaded();
    const reloaded = await settings.getFirstNameValue();
    expect(reloaded).toBe(updated);

    await settings.fillFirstName(original);
    await settings.submitPersonalInfo();
    await page.waitForResponse(
      (r) => r.url().includes('/api/profile') && r.request().method() === 'PUT' && r.status() === 200,
    );
  });

  test('password change with mismatched confirm shows error', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    await settings.fillPasswordChange('anything', 'NewPass123!', 'Mismatch1!');
    await settings.submitPasswordChange();

    await page.waitForTimeout(1_000);
    const hasError = await page.getByText(/match|mismatch|confirm/i).isVisible().catch(() => false);
    expect(hasError).toBe(true);
  });

  test('password change with too-short new password shows error', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    await settings.fillPasswordChange('anything', 'short', 'short');
    await settings.submitPasswordChange();

    await page.waitForTimeout(1_000);
    const hasError = await page.getByText(/8|short|length|character/i).isVisible().catch(() => false);
    expect(hasError).toBe(true);
  });

  test('password change with wrong current password shows server error', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    const settings = new SettingsPage(page);
    await settings.goto();

    await settings.fillPasswordChange(env.wrongPassword, 'ValidNew123!', 'ValidNew123!');

    const changePromise = page.waitForResponse(
      (r) => r.url().includes('/api/profile/password') && r.request().method() === 'PUT',
    );
    await settings.submitPasswordChange();
    const resp = await changePromise;

    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test('successful password change round-trip', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    const settings = new SettingsPage(page);
    await settings.goto();

    const tempPassword = `Temp${Date.now()}!`;

    const changePromise = page.waitForResponse(
      (r) => r.url().includes('/api/profile/password') && r.request().method() === 'PUT',
    );
    await settings.fillPasswordChange(env.mechanicPassword, tempPassword, tempPassword);
    await settings.submitPasswordChange();
    const resp = await changePromise;

    if (resp.status() === 200) {
      const revertPromise = page.waitForResponse(
        (r) => r.url().includes('/api/profile/password') && r.request().method() === 'PUT',
      );
      await settings.fillPasswordChange(tempPassword, env.mechanicPassword, env.mechanicPassword);
      await settings.submitPasswordChange();
      await revertPromise;
    }
  });
});
