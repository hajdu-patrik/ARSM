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
});
