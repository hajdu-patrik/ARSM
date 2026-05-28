import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

const tokenStorageKeyPattern = /token|jwt|access|refresh/i;

/** Reads storage keys that would indicate forbidden client-side token persistence. */
async function getTokenLikeStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate((patternSource) => {
    const pattern = new RegExp(patternSource, 'i');
    const keys = [
      ...Object.keys(localStorage),
      ...Object.keys(sessionStorage),
    ];

    return keys.filter((key) => pattern.test(key));
  }, tokenStorageKeyPattern.source);
}

test.describe('Login method edge cases', () => {
  test('shows wrong-method validation when an email is entered in phone mode', async ({ page }) => {
    await primeBrowserState(page);
    await page.goto('/login');

    await page.getByRole('button', { name: 'Phone' }).click();
    await page.getByLabel(/Email|E-mail|Phone|Telefon/i).fill('mechanic@example.test');
    await page.getByLabel(/Password|Jelszo|Jelszó/i).fill('StrongPass1!');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Please switch to Email mode or enter a valid phone number!');
  });

  test('logs in with a valid phone identifier without storing token-like keys', async ({ page }) => {
    const routeCallLog: string[] = [];

    await primeBrowserState(page);
    await installApiMocks(page, {
      profileEmail: 'phone.login@example.test',
      routeCallLog,
    });
    await page.goto('/login');

    await page.getByRole('button', { name: 'Phone' }).click();
  await page.getByLabel(/Email|E-mail|Phone|Telefon/i).fill('+36 30 123 4567');
  await page.getByLabel(/Password|Jelszo|Jelszó/i).fill('StrongPass1!');

    await Promise.all([
      page.waitForURL((url) => url.pathname !== '/login'),
      page.getByRole('button', { name: 'Login' }).click(),
    ]);

    expect(routeCallLog).toContain('POST /api/auth/login');
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
    expect(await getTokenLikeStorageKeys(page)).toEqual([]);
  });
});