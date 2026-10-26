/** An account whose password an administrator reset (a temporary one) can use only the change-password page:
 * the guards send it there, and it leaves once the password is replaced or the user logs out. */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { installApiMocks, type InstallApiMockOptions } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { fillLockedPasswordField } from './support/password-fields';
import { toastMessage } from './support/toast';

/** Paths a signed-in user with a temporary password must not stay on; each one is guarded or redirects on. */
const OTHER_APP_PATHS = ['/', '/login', '/customers', '/quotes', '/inventory', '/settings', '/admin/register'];

/** Starts the browser with a restorable session, as after a reload, under the given mock options. */
async function startSignedIn(page: Page, options: Partial<InstallApiMockOptions> = {}) {
  await primeBrowserState(page, { sessionHint: true });
  return installApiMocks(page, { profileEmail: 'temporary.password@example.test', isAdmin: true, ...options });
}

test.describe('Required password change', () => {
  test('a login with a temporary password lands on the change-password page, without the sidebar', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail, mustChangePassword: true });
    await new AuthPage(page).submitLogin(env);

    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await expect(page.getByText(/An administrator set a temporary password for your account/)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  });

  test('every other route of the app redirects to it', async ({ page }) => {
    await startSignedIn(page, { mustChangePassword: true });

    for (const path of OTHER_APP_PATHS) {
      await page.goto(path);
      await expect(page, `${path} must not be reachable`).toHaveURL(/\/change-password$/);
      await expect(page.locator('#change-password-current')).toBeVisible();
    }
  });

  test('a signed-out visitor is sent to login and a user without a temporary password to the scheduler', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: false });
    await installApiMocks(page, { profileEmail: 'signed.out@example.test', isAuthenticated: false });
    await page.goto('/change-password');
    await expect(page).toHaveURL(/\/login$/);

    await startSignedIn(page);
    await page.goto('/change-password');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
  });

  test('a 403 password_change_required during a session moves the user to the page', async ({ page }) => {
    const state = await startSignedIn(page);
    await page.goto('/customers');
    await expect(page.getByTestId('customers-search-input')).toBeVisible();

    // An administrator resets the password while this session is open: the next request is refused.
    state.mustChangePassword = true;
    await page.getByRole('link', { name: 'Quotes' }).click();

    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.locator('#change-password-current')).toBeVisible();
  });

  test('replacing the password clears the requirement and goes to the scheduler', async ({ page }) => {
    await startSignedIn(page, { mustChangePassword: true });
    await page.goto('/change-password');

    await fillLockedPasswordField(page.locator('#change-password-current'), 'TemporaryPass1!');
    await fillLockedPasswordField(page.locator('#change-password-new'), 'BrandNewPass1!');
    await fillLockedPasswordField(page.locator('#change-password-confirm'), 'BrandNewPass1!');
    await page.getByRole('button', { name: 'Change password' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
    await expect(toastMessage(page, 'Password changed successfully.')).toBeVisible();

    // The server forgot the requirement too: a reload stays on the scheduler.
    await page.reload();
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
  });

  test('the page offers a log out that ends the session', async ({ page }) => {
    await startSignedIn(page, { mustChangePassword: true });
    await page.goto('/change-password');

    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('arsm.auth.sessionHint'))).toBeNull();
  });
});
