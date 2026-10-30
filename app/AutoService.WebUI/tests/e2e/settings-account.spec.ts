/** Account section of Settings: which sections each role sees, and the delete-profile dialog (gating, reset on
 * cancel, the wrong-password refusal, the request and the sign-out). */
import { expect, test } from '@playwright/test';
import { openSettings } from './pages/settings.page';
import { errorToastMessage, toastMessage } from './support/toast';

const PASSWORD = 'CurrentPass1!';
const DELETE_PROFILE = 'DELETE /api/profile';

test.describe('Settings sections per role', () => {
  test('a mechanic sees the delete section and no company data', async ({ page }) => {
    const { settings } = await openSettings(page, { isAdmin: false });

    await expect(settings.deleteSection).toBeVisible();
    await expect(settings.companySection).toHaveCount(0);
  });

  test('an admin sees the company data and cannot delete the own profile', async ({ page }) => {
    const { settings } = await openSettings(page, { isAdmin: true });

    await expect(settings.companySection).toBeVisible();
    await expect(settings.deleteSection).toHaveCount(0);
    await expect(settings.passwordSection).toBeVisible();
  });
});

test.describe('Delete profile dialog', () => {
  test('keeps the confirm button disabled until both fields hold the same password', async ({ page }) => {
    const { settings } = await openSettings(page);
    const dialog = await settings.openDeleteDialog();
    const confirm = dialog.getByRole('button', { name: 'Confirm deletion' });

    await expect(confirm).toBeDisabled();

    await settings.fillDeletePasswords(PASSWORD, 'DifferentPass1!');
    await expect(confirm).toBeDisabled();
    await expect(page.locator('#delete-profile-password-confirm')).toHaveAccessibleDescription('The deletion passwords do not match.');

    await settings.fillDeletePasswords(PASSWORD, PASSWORD);
    await expect(confirm).toBeEnabled();
  });

  test('cancelling closes the dialog and the next opening starts empty', async ({ page }) => {
    const routeCallLog: string[] = [];
    const { settings } = await openSettings(page, { routeCallLog });
    const dialog = await settings.openDeleteDialog();
    await settings.fillDeletePasswords(PASSWORD, PASSWORD);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(routeCallLog).not.toContain(DELETE_PROFILE);

    await settings.openDeleteDialog();
    await expect(page.locator('#delete-profile-password')).toHaveValue('');
    await expect(page.locator('#delete-profile-password-confirm')).toHaveValue('');
  });

  test('sends the password, signs out and returns to login with the session hint cleared', async ({ page }) => {
    const { settings } = await openSettings(page);
    const dialog = await settings.openDeleteDialog();
    await settings.fillDeletePasswords(PASSWORD, PASSWORD);
    const deleteRequest = page.waitForRequest((request) => request.method() === 'DELETE' && new URL(request.url()).pathname === '/api/profile');

    await dialog.getByRole('button', { name: 'Confirm deletion' }).click();

    expect((await deleteRequest).postDataJSON()).toEqual({ currentPassword: PASSWORD });
    await expect(page).toHaveURL(/\/login$/);
    await expect(toastMessage(page, 'Profile deleted successfully.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('arsm.auth.sessionHint'))).toBeNull();
  });

  test('a wrong password is shown under the first field and the dialog stays open', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { [DELETE_PROFILE]: { status: 400, body: { errors: { CurrentPassword: ['Current password is invalid.'] } } } },
    });
    const dialog = await settings.openDeleteDialog();
    await settings.fillDeletePasswords(PASSWORD, PASSWORD);

    await dialog.getByRole('button', { name: 'Confirm deletion' }).click();

    const first = page.locator('#delete-profile-password');
    await expect(first).toHaveAttribute('aria-invalid', 'true');
    await expect(first).toHaveAccessibleDescription('Current password is invalid.');
    await expect(errorToastMessage(page, 'Current password is invalid.')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/settings$/);

    await first.fill('Other');
    await expect(first).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('a 403 is also read as a wrong password', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { [DELETE_PROFILE]: { status: 403, body: {} } },
    });
    const dialog = await settings.openDeleteDialog();
    await settings.fillDeletePasswords(PASSWORD, PASSWORD);

    await dialog.getByRole('button', { name: 'Confirm deletion' }).click();

    await expect(page.locator('#delete-profile-password')).toHaveAccessibleDescription('Current password is invalid.');
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('a refusal that names no field keeps the dialog and the session, with an error alert', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { [DELETE_PROFILE]: { status: 429, body: { code: 'lockout_active', retryAfterSeconds: 900 } } },
    });
    const dialog = await settings.openDeleteDialog();
    await settings.fillDeletePasswords(PASSWORD, PASSWORD);

    await dialog.getByRole('button', { name: 'Confirm deletion' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Failed to delete profile.' })).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('arsm.auth.sessionHint'))).toBe('1');
  });
});
