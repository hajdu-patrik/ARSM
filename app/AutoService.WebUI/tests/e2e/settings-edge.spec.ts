import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

async function fillLockedPasswordField(page: Page, selector: string, value: string): Promise<void> {
  const field = page.locator(selector);
  await field.click();
  await expect(field).not.toHaveAttribute('readonly', '');
  await field.fill(value);
}

test.describe('Settings edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true, language: 'en', theme: 'light' });
    await installApiMocks(page, {
      profileEmail: 'mechanic.settings@example.test',
      isAuthenticated: true,
    });
    await page.goto('/settings');
    await expect(page.locator('#settings-firstName')).toBeVisible();
  });

  test('saves profile changes through confirmation modal', async ({ page }) => {
    await page.locator('#settings-firstName').fill('Updated');
    await page.getByRole('button', { name: /Save Changes|Mentés/i }).click();

    const confirmDialog = page.getByRole('dialog', { name: /Confirm Changes|Módosítások megerősítése/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /Save|Mentés/i }).click();

    await expect(page.locator('output[aria-live="polite"]')).toContainText(/Profile updated successfully|Profil sikeresen frissítve/i);
    await expect(page.locator('#settings-firstName')).toHaveValue('Updated');
  });

  test('shows mismatch validation when password confirmation differs', async ({ page }) => {
    await fillLockedPasswordField(page, '#settings-currentPassword', 'CurrentPass1!');
    await fillLockedPasswordField(page, '#settings-newPassword', 'NewPassWord1!');
    await fillLockedPasswordField(page, '#settings-confirmPassword', 'DifferentPass1!');

    const submitButton = page.getByRole('button', { name: /Change Password|Jelszó módosítása/i });
    await expect(submitButton).toBeDisabled();
    await expect(page.getByText(/Passwords do not match|A jelszavak nem egyeznek/i)).toBeVisible();
    await expect(page.getByRole('dialog', { name: /Confirm Password Change|Jelszóváltoztatás megerősítése/i })).toHaveCount(0);
  });

  test('changes password through confirmation modal', async ({ page }) => {
    await fillLockedPasswordField(page, '#settings-currentPassword', 'CurrentPass1!');
    await fillLockedPasswordField(page, '#settings-newPassword', 'NewPassWord1!');
    await fillLockedPasswordField(page, '#settings-confirmPassword', 'NewPassWord1!');

    await page.getByRole('button', { name: /Change Password|Jelszó módosítása/i }).click();

    const confirmDialog = page.getByRole('dialog', { name: /Confirm Password Change|Jelszóváltoztatás megerősítése/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /Change Password|Jelszó módosítása/i }).click();

    await expect(page.locator('output[aria-live="polite"]')).toContainText(/Password changed successfully|Jelszó sikeresen módosítva/i);
  });

  test('persists language and theme toggle preferences', async ({ page }) => {
    const initialTheme = await page.evaluate(() => localStorage.getItem('preferred-theme'));

    await page.getByTestId('theme-language-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
    const language = await page.evaluate(() => localStorage.getItem('preferred-language'));
    expect(language).toBe('hu');

    await page.getByTestId('theme-mode-toggle').click();

    const changedTheme = await page.evaluate(() => localStorage.getItem('preferred-theme'));
    expect(changedTheme).not.toBe(initialTheme);

    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDarkClass).toBe(changedTheme === 'dark');
  });
});
