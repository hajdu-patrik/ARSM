/** A write refused with 401 refreshes the session and is retried once: only a refresh answered 401 or 403 ends the
 * session, and a request that stays refused is not retried again. */
import { expect, test, type Page } from '@playwright/test';
import { openSettings, type SettingsPage } from './pages/settings.page';
import type { MockFailure } from './support/api-mock-response';
import { errorToastMessage, toastMessage } from './support/toast';

const HINT_KEY = 'arsm.auth.sessionHint';
const PROFILE_PUT = 'PUT /api/profile';
const REFRESH = 'POST /api/auth/refresh';

/** Edits the first name and confirms the save, which sends `PUT /api/profile`. */
async function saveProfile(settings: SettingsPage): Promise<void> {
  await settings.firstName.fill('Resilient');
  await settings.saveProfileButton().click();
  await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();
}

function sessionHint(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), HINT_KEY);
}

function countOf(routeCallLog: readonly string[], routeKey: string): number {
  return routeCallLog.filter((entry) => entry === routeKey).length;
}

const PASSING_REFRESH_FAILURES: readonly { readonly title: string; readonly failure: MockFailure }[] = [
  { title: 'rate-limited (429)', failure: { status: 429, body: {} } },
  { title: 'dropped (network failure)', failure: { abort: true } },
];

test.describe('Refresh that fails for a passing reason', () => {
  for (const { title, failure } of PASSING_REFRESH_FAILURES) {
    test(`a write whose refresh is ${title} keeps the session and can be saved again`, async ({ page }) => {
      const routeCallLog: string[] = [];
      const { settings } = await openSettings(page, {
        routeCallLog,
        unauthorizedOnceRouteKeys: [PROFILE_PUT],
        routeFailures: { [REFRESH]: failure },
      });

      await saveProfile(settings);

      await expect(errorToastMessage(page, 'Failed to update profile.')).toBeVisible();
      await expect(page).toHaveURL(/\/settings$/);
      expect(await sessionHint(page)).toBe('1');

      await settings.saveProfileButton().click();
      await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();

      await expect(toastMessage(page, 'Profile updated successfully.')).toBeVisible();
      expect(countOf(routeCallLog, REFRESH)).toBe(1);
      expect(countOf(routeCallLog, PROFILE_PUT)).toBe(2);
    });
  }

  test('a write whose refresh is answered 503 detours through /500 and keeps the session', async ({ page }) => {
    const { settings } = await openSettings(page, {
      unauthorizedOnceRouteKeys: [PROFILE_PUT],
      routeFailures: { [REFRESH]: { status: 503, body: {} } },
    });

    await saveProfile(settings);

    await expect(page).toHaveURL(/\/500\?returnTo=%2Fsettings$/);
    expect(await sessionHint(page)).toBe('1');
    await expect(page).toHaveURL(/\/settings$/, { timeout: 8000 });
    await expect(settings.firstName).toBeVisible();
  });
});

test.describe('Refresh that rejects the session', () => {
  for (const status of [401, 403]) {
    test(`a write whose refresh is answered ${String(status)} ends the session at the login page`, async ({ page }) => {
      const { settings } = await openSettings(page, {
        unauthorizedOnceRouteKeys: [PROFILE_PUT],
        routeFailures: { [REFRESH]: { status, body: {} } },
      });

      await saveProfile(settings);

      await expect(page).toHaveURL(/\/login$/);
      expect(await sessionHint(page)).toBeNull();
    });
  }
});

test.describe('Retry after a refresh', () => {
  test('a write that keeps answering 401 after the refresh is sent twice with one refresh, then fails', async ({ page }) => {
    const routeCallLog: string[] = [];
    const { settings } = await openSettings(page, {
      routeCallLog,
      routeFailures: { [PROFILE_PUT]: { status: 401, body: {}, repeat: true } },
    });

    await saveProfile(settings);

    await expect(errorToastMessage(page, 'Failed to update profile.')).toBeVisible();
    expect(countOf(routeCallLog, PROFILE_PUT)).toBe(2);
    expect(countOf(routeCallLog, REFRESH)).toBe(1);
    await expect(page).toHaveURL(/\/settings$/);
  });
});
