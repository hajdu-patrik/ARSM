import { expect, test } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

/** The theme and language toggles on Settings; the profile, password and delete flows are in the settings-* specs. */
test.describe('Settings theme and language toggles', () => {
  test.beforeEach(async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true, language: 'en', theme: 'light' });
    await installApiMocks(page, {
      profileEmail: 'mechanic.settings@example.test',
      isAuthenticated: true,
    });
    await page.goto('/settings');
    await expect(page.locator('#settings-firstName')).toBeVisible();
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
    expect(await page.evaluate(() => localStorage.getItem('arsm.pref.theme'))).toBe('dark');

    // The language button names the language it switches to: English is active, so it offers HU.
    await expect(languageToggle).toHaveText('HU');
    await languageToggle.click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
    await expect(languageToggle).toHaveText('EN');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('arsm.pref.language'))).toBe('hu');
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
    expect(await page.evaluate(() => localStorage.getItem('arsm.pref.theme'))).toBeNull();

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html).toHaveClass(/\bdark\b/);
  });

  test('keeps a picked theme when the system color scheme changes', async ({ page }) => {
    const html = page.locator('html');

    await page.getByTestId('theme-mode-toggle').click();
    await expect(html).not.toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem('arsm.pref.theme'))).toBe('light');

    // The system goes light and back to dark; the picked light theme stays.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html).not.toHaveClass(/\bdark\b/);
  });
});
