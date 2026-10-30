/** Login refusals from the server: bad credentials, the lockout wait in minutes (from the body or the Retry-After
 * header), a dropped connection, a retry that works, and the /500 detour for a failing server. */
import { expect, test, type Page } from '@playwright/test';
import { installApiMocks, type InstallApiMockOptions } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import type { MockFailure } from './support/api-mock-response';
import { errorToastMessage, toastMessage } from './support/toast';

const LOGIN = 'POST /api/auth/login';
const PASSWORD = 'StrongPass1!';

async function submitLoginWith(page: Page, failure: MockFailure | null, options: Partial<InstallApiMockOptions> = {}) {
  await primeBrowserState(page);
  const state = await installApiMocks(page, {
    profileEmail: 'login.failures@example.test',
    ...(failure === null ? {} : { routeFailures: { [LOGIN]: failure } }),
    ...options,
  });
  await page.goto('/login');
  await submitCredentials(page);
  return state;
}

async function submitCredentials(page: Page): Promise<void> {
  await page.locator('#identifier').fill('mechanic@example.test');
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

test.describe('Rejected credentials', () => {
  test('shows the invalid-credentials alert, keeps the email, empties the password and stays signed out', async ({ page }) => {
    await submitLoginWith(page, { status: 401, body: { detail: 'Invalid login credentials.' } });

    await expect(errorToastMessage(page, 'Invalid login credentials. Please try again.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('#identifier')).toHaveValue('mechanic@example.test');
    await expect(page.locator('#password')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem('arsm.auth.sessionHint'))).toBeNull();
  });

  test('a second attempt after a refusal signs in', async ({ page }) => {
    await submitLoginWith(page, { status: 401, body: { detail: 'Invalid login credentials.' } });
    await expect(errorToastMessage(page, 'Invalid login credentials. Please try again.')).toBeVisible();

    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
    await expect(toastMessage(page, 'Login successful.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('arsm.auth.sessionHint'))).toBe('1');
  });

  test('a mechanic-only refusal names the portal rule', async ({ page }) => {
    await submitLoginWith(page, { status: 403, body: { detail: 'mechanic_only_login' } });

    await expect(errorToastMessage(page, 'Only mechanics can access this portal.')).toBeVisible();
  });

  test('a validation answer shows the generic login failure', async ({ page }) => {
    await submitLoginWith(page, { status: 400, body: { errors: { Email: ['Email is required.'] } } });

    await expect(errorToastMessage(page, 'Login failed. Please try again.')).toBeVisible();
  });

  test('a dropped connection says the database is unavailable', async ({ page }) => {
    await submitLoginWith(page, { abort: true });

    await expect(errorToastMessage(page, 'Database is currently unavailable.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Lockout wait', () => {
  const WAITS = [
    { seconds: 900, message: 'Too many attempts. Try again in 15 minutes.' },
    { seconds: 180, message: 'Too many attempts. Try again in 3 minutes.' },
    { seconds: 61, message: 'Too many attempts. Try again in 2 minutes.' },
    { seconds: 60, message: 'Too many attempts. Try again in 1 minute.' },
    { seconds: 5, message: 'Too many attempts. Try again in 1 minute.' },
  ];

  for (const wait of WAITS) {
    test(`a ${String(wait.seconds)} second wait in the body reads "${wait.message}"`, async ({ page }) => {
      await submitLoginWith(page, { status: 429, body: { code: 'lockout_active', retryAfterSeconds: wait.seconds } });

      await expect(errorToastMessage(page, wait.message)).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test('the Retry-After header names the wait when the body does not', async ({ page }) => {
    await submitLoginWith(page, { status: 429, body: { error: 'Too many login attempts.' }, headers: { 'Retry-After': '120' } });

    await expect(errorToastMessage(page, 'Too many attempts. Try again in 2 minutes.')).toBeVisible();
  });

  test('without any wait the message asks to try later', async ({ page }) => {
    await submitLoginWith(page, { status: 429, body: {} });

    await expect(errorToastMessage(page, 'Too many attempts. Please try again later.')).toBeVisible();
  });
});

test.describe('Failing server', () => {
  test('a 503 sends the browser to the server-error page, which returns to login after its countdown', async ({ page }) => {
    await submitLoginWith(page, { status: 503, body: {} });

    await expect(page).toHaveURL(/\/500\?returnTo=%2Flogin$/);
    await expect(page.getByText('Server error')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/, { timeout: 8000 });
    await expect(page.locator('#identifier')).toBeVisible();
  });
});
