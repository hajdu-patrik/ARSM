import { expect, test } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

test.describe('Error route edge cases', () => {
  test('redirects unauthenticated users from not-found page to login after countdown', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: false, language: 'en' });
    await installApiMocks(page, {
      profileEmail: 'edge.notfound@example.test',
      isAuthenticated: false,
    });

    await page.goto('/non-existent-edge-route');

    await expect(page.getByText(/Page Not Found|Oldal nem található/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/, { timeout: 7000 });
  });

  test('renders the not-found page at once, with no loading spinner before it', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: false, language: 'en' });
    await installApiMocks(page, {
      profileEmail: 'edge.notfound-spinner@example.test',
      isAuthenticated: false,
    });
    // The lazy-route fallback is the only role=status spinner on this route; note if one ever enters the DOM.
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.querySelector('[role="status"]') !== null) {
          Reflect.set(globalThis, '__spinnerSeen', true);
        }
      }).observe(document, { childList: true, subtree: true });
    });

    await page.goto('/non-existent-edge-route');

    await expect(page.getByText(/Page Not Found|Oldal nem található/i)).toBeVisible();
    expect(await page.evaluate(() => Reflect.get(globalThis, '__spinnerSeen') === true), 'a loading spinner was shown first').toBe(false);
  });

  test('offers the scheduler as the way back to a signed-in user', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true, language: 'en' });
    await installApiMocks(page, {
      profileEmail: 'edge.notfound-user@example.test',
      isAuthenticated: true,
    });

    await page.goto('/non-existent-edge-route');

    const backToScheduler = page.getByRole('button', { name: 'Go to scheduler' });
    await expect(backToScheduler).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to login' })).toHaveCount(0);

    await backToScheduler.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
  });

  test('uses sanitized returnTo target on server error page', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: false, language: 'en' });
    await installApiMocks(page, {
      profileEmail: 'edge.server-error@example.test',
      isAuthenticated: false,
    });

    await page.goto('/500?returnTo=%2Flogin');

    await expect(page.getByText(/Server Error|Szerverhiba/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/, { timeout: 7000 });
  });

  for (const returnTo of ['%2F%5Cevil.com', '%2F%2Fevil.com']) {
    test(`never leaves the app origin for returnTo=${returnTo}`, async ({ page }) => {
      await primeBrowserState(page, { sessionHint: false, language: 'en' });
      await installApiMocks(page, {
        profileEmail: 'edge.server-error-redirect@example.test',
        isAuthenticated: false,
      });
      const foreignRequests: string[] = [];
      await page.route(/^https?:\/\/([^/]*\.)?evil\.com(:\d+)?\//, async (route) => {
        foreignRequests.push(route.request().url());
        await route.abort();
      });

      await page.goto(`/500?returnTo=${returnTo}`);
      const appOrigin = new URL(page.url()).origin;
      await expect(page.getByText(/Server Error|Szerverhiba/i)).toBeVisible();

      // The countdown lasts 3 s; the rejected target falls back to a reload of /500.
      await page.waitForTimeout(4000);

      expect(new URL(page.url()).origin).toBe(appOrigin);
      expect(new URL(page.url()).pathname).toBe('/500');
      expect(foreignRequests).toEqual([]);
    });
  }
});
