import { expect, test } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { fillLockedPasswordField } from './support/password-fields';

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
    await fillLockedPasswordField(page.locator('#change-password-current'), 'CurrentPass1!');
    await fillLockedPasswordField(page.locator('#change-password-new'), 'NewPassWord1!');
    await fillLockedPasswordField(page.locator('#change-password-confirm'), 'DifferentPass1!');

    const submitButton = page.getByRole('button', { name: /Change Password|Jelszó módosítása/i });
    await expect(submitButton).toBeDisabled();
    await expect(page.getByText(/Passwords do not match|A jelszavak nem egyeznek/i)).toBeVisible();
    await expect(page.getByRole('dialog', { name: /Confirm Password Change|Jelszóváltoztatás megerősítése/i })).toHaveCount(0);
  });

  test('changes password through confirmation modal', async ({ page }) => {
    await fillLockedPasswordField(page.locator('#change-password-current'), 'CurrentPass1!');
    await fillLockedPasswordField(page.locator('#change-password-new'), 'NewPassWord1!');
    await fillLockedPasswordField(page.locator('#change-password-confirm'), 'NewPassWord1!');

    await page.getByRole('button', { name: /Change Password|Jelszó módosítása/i }).click();

    const confirmDialog = page.getByRole('dialog', { name: /Confirm Password Change|Jelszóváltoztatás megerősítése/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /Change Password|Jelszó módosítása/i }).click();

    await expect(page.locator('output[aria-live="polite"]')).toContainText(/Password changed successfully|Jelszó sikeresen módosítva/i);
  });

  test('persists language and theme toggle preferences', async ({ page }) => {
    const themeToggle = page.getByTestId('theme-mode-toggle');
    const languageToggle = page.getByTestId('theme-language-toggle');

    // The icon shows the active theme (a sun in the light theme); the title names the switch.
    await expect(themeToggle.locator('svg.lucide-sun')).toBeVisible();
    await expect(themeToggle).toHaveAttribute('title', 'Switch to dark mode');
    await themeToggle.click();

    await expect(themeToggle.locator('svg.lucide-moon')).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem('preferred-theme'))).toBe('dark');

    // The language button names the language it switches to: English is active, so it offers HU.
    await expect(languageToggle).toHaveText('HU');
    await languageToggle.click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
    await expect(languageToggle).toHaveText('EN');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('preferred-language'))).toBe('hu');
  });

  test('keeps profile deletion disabled until password confirmation matches', async ({ page }) => {
    await page.getByRole('button', { name: /Delete Profile|Profil törlése/i }).click();

    const deleteDialog = page.getByRole('dialog', { name: /Confirm profile deletion|Profil törlésének megerősítése/i });
    await expect(deleteDialog).toBeVisible();

    await fillLockedPasswordField(page.locator('#delete-profile-password'), 'CurrentPass1!');
    await fillLockedPasswordField(page.locator('#delete-profile-password-confirm'), 'DifferentPass1!');

    await expect(deleteDialog.getByRole('button', { name: /Confirm Deletion|Törlés megerősítése/i })).toBeDisabled();
  });

  test('deletes profile after matching password confirmation and clears session hint', async ({ page }) => {
    await page.getByRole('button', { name: /Delete Profile|Profil törlése/i }).click();

    const deleteDialog = page.getByRole('dialog', { name: /Confirm profile deletion|Profil törlésének megerősítése/i });
    await fillLockedPasswordField(page.locator('#delete-profile-password'), 'CurrentPass1!');
    await fillLockedPasswordField(page.locator('#delete-profile-password-confirm'), 'CurrentPass1!');
    await deleteDialog.getByRole('button', { name: /Confirm Deletion|Törlés megerősítése/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('output[aria-live="polite"]')).toContainText(/Profile deleted successfully|Profil sikeresen törölve/i);
    const sessionHint = await page.evaluate(() => localStorage.getItem('autoservice-session-hint'));
    expect(sessionHint).toBeNull();
  });
});

test.describe('Theme default', () => {
  test.use({ colorScheme: 'dark' });

  test.beforeEach(async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true, theme: 'system' });
    await installApiMocks(page, {
      profileEmail: 'mechanic.theme@example.test',
      isAuthenticated: true,
    });
    await page.goto('/settings');
    await expect(page.locator('#settings-firstName')).toBeVisible();
  });

  test('starts from the system color scheme and follows it until a theme is picked', async ({ page }) => {
    const html = page.locator('html');

    await expect(html).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem('preferred-theme'))).toBeNull();

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html).toHaveClass(/\bdark\b/);
  });

  test('keeps a picked theme when the system color scheme changes', async ({ page }) => {
    const html = page.locator('html');

    await page.getByTestId('theme-mode-toggle').click();
    await expect(html).not.toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem('preferred-theme'))).toBe('light');

    // The system goes light and back to dark; the picked light theme stays.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html).not.toHaveClass(/\bdark\b/);
  });
});
