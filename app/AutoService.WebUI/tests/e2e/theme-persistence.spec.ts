/** Theme and language choices survive a reload without a stored session: the first visit is Hungarian and follows
 * the system scheme, a picked language or theme is saved under its registry key and applied before the first paint. */
import { expect, test } from '@playwright/test';
import { PREF_LANGUAGE_KEY, PREF_THEME_KEY } from '../../src/utils/browserStorageKeys';
import { installApiMocks } from './support/api-mocks';
import { seedSplashShown } from './support/browser-state';

test.describe('Language and theme on the login page', () => {
  test.beforeEach(async ({ page }) => {
    await seedSplashShown(page);
    await installApiMocks(page, { profileEmail: 'theme.persistence@example.test', isAuthenticated: false });
  });

  test('a first visit is Hungarian; picking English is saved and kept after a reload', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Bejelentkezés', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
    expect(await page.evaluate((key) => localStorage.getItem(key), PREF_LANGUAGE_KEY)).toBeNull();

    await page.getByTestId('theme-language-toggle').click();
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), PREF_LANGUAGE_KEY)).toBe('en');

    await page.reload();

    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByTestId('theme-language-toggle')).toHaveText('HU');
  });

  test('a language picked and then switched back is saved as Hungarian', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('theme-language-toggle').click();
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();

    await page.getByTestId('theme-language-toggle').click();

    await expect(page.getByRole('button', { name: 'Bejelentkezés', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), PREF_LANGUAGE_KEY)).toBe('hu');
  });

  test('a picked dark theme is saved and already applied when the reloaded document is parsed', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    expect(await page.evaluate((key) => localStorage.getItem(key), PREF_THEME_KEY)).toBeNull();

    await page.getByTestId('theme-mode-toggle').click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(await page.evaluate((key) => localStorage.getItem(key), PREF_THEME_KEY)).toBe('dark');

    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    await expect(page.getByTestId('theme-mode-toggle')).toHaveAttribute('title', 'Váltás világos módra');
  });

  test('toggling twice returns to light and saves it', async ({ page }) => {
    await page.goto('/login');
    const toggle = page.getByTestId('theme-mode-toggle');

    await toggle.click();
    await toggle.click();

    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    expect(await page.evaluate((key) => localStorage.getItem(key), PREF_THEME_KEY)).toBe('light');
  });
});
