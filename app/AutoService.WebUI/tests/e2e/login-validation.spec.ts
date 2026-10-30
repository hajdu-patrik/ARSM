/** Login form rules: what is sent for an email or a phone identifier, the submit-time refusals, the mode switch,
 * the password toggle, the busy state and the Hungarian wording. */
import { setTimeout as sleep } from 'node:timers/promises';
import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState, type TestLanguage } from './support/browser-state';
import { errorToastMessage, toastMessage } from './support/toast';

const PASSWORD = 'StrongPass1!';

async function openLogin(page: Page, language: TestLanguage = 'en'): Promise<void> {
  await primeBrowserState(page, { language });
  await installApiMocks(page, { profileEmail: 'login.validation@example.test' });
  await page.goto('/login');
  await expect(page.locator('#identifier')).toBeVisible();
}

function waitForLoginRequest(page: Page) {
  return page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/login');
}

test.describe('Login identifiers', () => {
  test('sends a trimmed, lower-cased email and lands on the scheduler with a success toast', async ({ page }) => {
    await openLogin(page);
    const loginRequest = waitForLoginRequest(page);

    await page.locator('#identifier').fill('  Mechanic.Upper@Example.TEST ');
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    expect((await loginRequest).postDataJSON()).toEqual({ email: 'mechanic.upper@example.test', password: PASSWORD });
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
    await expect(toastMessage(page, 'Login successful.')).toBeVisible();
  });

  for (const typed of ['+36 30 123 4567', '06 30 123 4567', '(30) 123-4567']) {
    test(`sends the phone number "${typed}" in the international form`, async ({ page }) => {
      await openLogin(page);
      await page.getByRole('button', { name: 'Phone', exact: true }).click();
      const loginRequest = waitForLoginRequest(page);

      await page.locator('#identifier').fill(typed);
      await page.locator('#password').fill(PASSWORD);
      await page.getByRole('button', { name: 'Log in', exact: true }).click();

      expect((await loginRequest).postDataJSON()).toEqual({ phoneNumber: '+36301234567', password: PASSWORD });
    });
  }

  test('refuses a phone number of a country outside the accepted list', async ({ page }) => {
    await openLogin(page);
    await page.getByRole('button', { name: 'Phone', exact: true }).click();

    await page.locator('#identifier').fill('+1 202 555 0123');
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    await expect(page.locator('#identifier')).toHaveAccessibleDescription('Invalid format. Try again.');
    await expect(errorToastMessage(page, 'Invalid format. Try again.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Login refusals before any request', () => {
  test('refuses a malformed email inline and with a toast, and focuses the field', async ({ page }) => {
    const routeCallLog: string[] = [];
    await primeBrowserState(page);
    await installApiMocks(page, { profileEmail: 'login.validation@example.test', routeCallLog });
    await page.goto('/login');

    await page.locator('#identifier').fill('not-an-email');
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    await expect(page.locator('#identifier')).toBeFocused();
    await expect(page.locator('#identifier')).toHaveAccessibleDescription('Invalid format. Try again.');
    await expect(errorToastMessage(page, 'Invalid format. Try again.')).toBeVisible();
    expect(routeCallLog).not.toContain('POST /api/auth/login');
  });

  test('treats a blank password as missing and focuses it, and typing clears the message', async ({ page }) => {
    await openLogin(page);
    const password = page.locator('#password');

    await page.locator('#identifier').fill('mechanic@example.test');
    await password.fill('   ');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    await expect(password).toBeFocused();
    await expect(password).toHaveAccessibleDescription('This field is required.');
    await expect(page.locator('#identifier')).not.toHaveAttribute('aria-invalid', 'true');

    await password.fill('x');
    await expect(password).not.toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('Login form controls', () => {
  test('switching the mode empties the identifier and clears its error', async ({ page }) => {
    await openLogin(page);
    const identifier = page.locator('#identifier');
    const email = page.getByRole('button', { name: 'Email', exact: true });
    const phone = page.getByRole('button', { name: 'Phone', exact: true });

    await expect(email).toHaveAttribute('aria-pressed', 'true');
    await identifier.fill('broken');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(identifier).toHaveAttribute('aria-invalid', 'true');

    await phone.click();

    await expect(phone).toHaveAttribute('aria-pressed', 'true');
    await expect(email).toHaveAttribute('aria-pressed', 'false');
    await expect(identifier).toHaveValue('');
    await expect(identifier).toHaveAttribute('type', 'tel');
    await expect(identifier).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('the password toggle reveals and hides the typed password', async ({ page }) => {
    await openLogin(page);
    const password = page.locator('#password');
    await password.fill(PASSWORD);

    await page.getByRole('button', { name: 'Show', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Hide', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('while the request runs the form is busy and a single login is sent', async ({ page }) => {
    await openLogin(page);
    let loginRequests = 0;
    await page.route('**/api/auth/login', async (route) => {
      if (route.request().method() === 'POST') {
        loginRequests += 1;
        await sleep(1200);
      }
      await route.fallback();
    });

    await page.locator('#identifier').fill('mechanic@example.test');
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    const busy = page.getByRole('button', { name: 'Logging in...' });
    await expect(busy).toBeDisabled();
    await expect(busy).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#identifier')).toBeDisabled();
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
    expect(loginRequests).toBe(1);
  });
});

test.describe('Login in Hungarian', () => {
  test('shows the Hungarian labels and refusals', async ({ page }) => {
    await openLogin(page, 'hu');

    await expect(page.getByRole('heading', { name: 'Üdvözöljük az ARSM-ben' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Telefon', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Bejelentkezés', exact: true }).click();

    await expect(page.locator('#identifier')).toHaveAccessibleDescription('Ez a mező kötelező.');
    await expect(page.locator('#password')).toHaveAccessibleDescription('Ez a mező kötelező.');

    await page.locator('#identifier').fill('+36 30 123 4567');
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Bejelentkezés', exact: true }).click();

    await expect(errorToastMessage(page, 'Váltson Telefon módra, vagy adjon meg érvényes e-mail-címet.')).toBeVisible();
  });
});
