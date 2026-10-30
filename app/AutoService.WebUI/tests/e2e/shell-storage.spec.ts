/** Browser storage: the one-shot takeover of the pre-registry names (and their cleanup), and an app that keeps
 * working when storage is blocked. */
import { expect, test, type Page } from '@playwright/test';
import {
  AUTH_SESSION_HINT_KEY,
  LEGACY_AUTH_SESSION_HINT_KEY,
  LEGACY_ERROR_PAGE_IMAGES_CACHE_NAME,
  LEGACY_ERROR_PAGE_IMAGE_CACHED_AT_KEY_PREFIX,
  LEGACY_PREF_LANGUAGE_KEY,
  LEGACY_PREF_SIDEBAR_COLLAPSED_KEY,
  LEGACY_PREF_THEME_KEY,
  LEGACY_QUERY_CACHE_PRIVATE_KEY,
  LEGACY_SCHEDULER_SELECTED_VIEW_KEY,
  LEGACY_SPLASH_FIRST_SHOWN_KEY,
  LEGACY_SPLASH_SKIP_ON_NEXT_BOOT_KEY,
  PREF_LANGUAGE_KEY,
  PREF_SIDEBAR_COLLAPSED_KEY,
  PREF_THEME_KEY,
  SPLASH_FIRST_SHOWN_KEY,
} from '../../src/utils/browserStorageKeys';
import { installApiMocks } from './support/api-mocks';
import { seedStorageOnce } from './support/browser-state';

const LEGACY_IMAGE_STAMP_KEY = `${LEGACY_ERROR_PAGE_IMAGE_CACHED_AT_KEY_PREFIX}/Error-404.webp`;

function readLocal(page: Page, key: string): Promise<string | null> {
  return page.evaluate((storageKey) => localStorage.getItem(storageKey), key);
}

function readSession(page: Page, key: string): Promise<string | null> {
  return page.evaluate((storageKey) => sessionStorage.getItem(storageKey), key);
}

test.describe('Legacy storage names', () => {
  test('the old values are taken over under the registry names and the old names are removed', async ({ page }) => {
    await seedStorageOnce(page, {
      local: {
        [LEGACY_PREF_THEME_KEY]: 'dark',
        [LEGACY_PREF_LANGUAGE_KEY]: 'en',
        [LEGACY_PREF_SIDEBAR_COLLAPSED_KEY]: 'true',
        [LEGACY_SPLASH_FIRST_SHOWN_KEY]: '1',
        [LEGACY_AUTH_SESSION_HINT_KEY]: '1',
        [LEGACY_QUERY_CACHE_PRIVATE_KEY]: '{"old":true}',
        [LEGACY_IMAGE_STAMP_KEY]: '123',
      },
      session: {
        [LEGACY_SCHEDULER_SELECTED_VIEW_KEY]: '{"mode":"month"}',
        [LEGACY_SPLASH_SKIP_ON_NEXT_BOOT_KEY]: '1',
      },
    });
    await installApiMocks(page, { profileEmail: 'legacy.migration@example.test' });

    await page.goto('/login');

    // The takeover hint restores the session, so the signed-in visitor is moved off the login page.
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await expect(page.locator('aside:visible').getByRole('button', { name: 'Expand menu' })).toBeVisible();
    expect(await readLocal(page, PREF_THEME_KEY)).toBe('dark');
    expect(await readLocal(page, PREF_LANGUAGE_KEY)).toBe('en');
    expect(await readLocal(page, PREF_SIDEBAR_COLLAPSED_KEY)).toBe('true');
    expect(await readLocal(page, SPLASH_FIRST_SHOWN_KEY)).toBe('1');
    expect(await readLocal(page, AUTH_SESSION_HINT_KEY)).toBe('1');

    for (const legacyKey of [
      LEGACY_PREF_THEME_KEY,
      LEGACY_PREF_LANGUAGE_KEY,
      LEGACY_PREF_SIDEBAR_COLLAPSED_KEY,
      LEGACY_SPLASH_FIRST_SHOWN_KEY,
      LEGACY_AUTH_SESSION_HINT_KEY,
      LEGACY_QUERY_CACHE_PRIVATE_KEY,
      LEGACY_IMAGE_STAMP_KEY,
    ]) {
      expect(await readLocal(page, legacyKey), `${legacyKey} must be removed`).toBeNull();
    }
    expect(await readSession(page, LEGACY_SCHEDULER_SELECTED_VIEW_KEY)).toBeNull();
    expect(await readSession(page, LEGACY_SPLASH_SKIP_ON_NEXT_BOOT_KEY)).toBeNull();
  });

  test('a value already under the registry name wins over the old one', async ({ page }) => {
    await seedStorageOnce(page, {
      local: { [PREF_THEME_KEY]: 'light', [LEGACY_PREF_THEME_KEY]: 'dark', [PREF_LANGUAGE_KEY]: 'hu', [LEGACY_PREF_LANGUAGE_KEY]: 'en' },
    });
    await installApiMocks(page, { profileEmail: 'legacy.precedence@example.test', isAuthenticated: false });

    await page.goto('/login');

    await expect(page.getByRole('button', { name: 'Bejelentkezés', exact: true })).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    expect(await readLocal(page, PREF_THEME_KEY)).toBe('light');
    expect(await readLocal(page, PREF_LANGUAGE_KEY)).toBe('hu');
    expect(await readLocal(page, LEGACY_PREF_THEME_KEY)).toBeNull();
    expect(await readLocal(page, LEGACY_PREF_LANGUAGE_KEY)).toBeNull();
  });

  test('the legacy error-illustration cache is deleted at the next start', async ({ page }) => {
    await installApiMocks(page, { profileEmail: 'legacy.cache@example.test', isAuthenticated: false });
    await page.goto('/login');
    await page.evaluate(async (name) => {
      const cache = await caches.open(name);
      await cache.put('/legacy-illustration', new Response('x'));
    }, LEGACY_ERROR_PAGE_IMAGES_CACHE_NAME);
    expect(await page.evaluate((name) => caches.has(name), LEGACY_ERROR_PAGE_IMAGES_CACHE_NAME)).toBe(true);

    await page.reload();

    await expect.poll(() => page.evaluate((name) => caches.has(name), LEGACY_ERROR_PAGE_IMAGES_CACHE_NAME)).toBe(false);
  });
});

test.describe('Blocked storage', () => {
  test('the login page renders and the theme and language switches still work for the visit', async ({ page }) => {
    await page.addInitScript(() => {
      const refuse = () => {
        throw new DOMException('Storage is blocked.', 'SecurityError');
      };
      Storage.prototype.getItem = refuse;
      Storage.prototype.setItem = refuse;
      Storage.prototype.removeItem = refuse;
    });
    await installApiMocks(page, { profileEmail: 'blocked.storage@example.test', isAuthenticated: false });

    await page.goto('/login');
    await expect(page.locator('#identifier')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('theme-mode-toggle').click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await page.getByTestId('theme-language-toggle').click();
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  });
});
