/** Password change on Settings: the disabled-submit reasons, the confirmation step, the request, and every server
 * refusal (wrong current password, each password-policy message, generic failures) under its field. */
import { expect, test } from '@playwright/test';
import { openSettings } from './pages/settings.page';
import { errorToastMessage, toastMessage, toastRegion } from './support/toast';

const CURRENT = 'CurrentPass1!';
const NEXT = 'NewPassWord1!';
const CHANGE_PASSWORD = 'POST /api/profile/change-password';

interface PolicyRefusal {
  readonly rule: string;
  readonly serverMessage: string;
  readonly shown: string;
}

/** The messages ASP.NET Identity sends for a new password that breaks one rule, and what the form must show. */
const POLICY_REFUSALS: readonly PolicyRefusal[] = [
  { rule: 'uppercase', serverMessage: "Passwords must have at least one uppercase ('A'-'Z').", shown: 'Password must contain at least one uppercase letter.' },
  { rule: 'lowercase', serverMessage: "Passwords must have at least one lowercase ('a'-'z').", shown: 'Password must contain at least one lowercase letter.' },
  { rule: 'digit', serverMessage: "Passwords must have at least one digit ('0'-'9').", shown: 'Password must contain at least one number.' },
  { rule: 'special character', serverMessage: 'Passwords must have at least one non alphanumeric character.', shown: 'Password must contain at least one special character.' },
];

test.describe('Password form gating', () => {
  test('names why the submit is disabled: incomplete, too short, mismatching', async ({ page }) => {
    const { settings } = await openSettings(page);
    const submit = settings.changePasswordButton();

    await expect(submit).toBeDisabled();
    await expect(settings.passwordSection).toContainText('Fill in all password fields to continue.');

    await settings.fillPasswords(CURRENT, 'Short1!', 'Short1!');
    await expect(submit).toBeDisabled();
    await expect(settings.passwordSection).toContainText('Password must be at least 8 characters.');
    await expect(page.locator('#change-password-new')).toHaveAccessibleDescription('Password must be at least 8 characters.');

    await settings.fillPasswords(CURRENT, NEXT, 'Different1!');
    await expect(submit).toBeDisabled();
    await expect(page.locator('#change-password-confirm')).toHaveAccessibleDescription('Passwords do not match.');

    await settings.fillPasswords(CURRENT, NEXT, NEXT);
    await expect(submit).toBeEnabled();
  });

  test('the visibility buttons reveal and hide each field', async ({ page }) => {
    const { settings } = await openSettings(page);
    const current = page.locator('#change-password-current');

    await settings.fillPasswords(CURRENT, NEXT, NEXT);
    await expect(current).toHaveAttribute('type', 'password');

    await settings.passwordSection.getByRole('button', { name: 'Show password' }).first().click();
    await expect(current).toHaveAttribute('type', 'text');

    await settings.passwordSection.getByRole('button', { name: 'Hide password' }).click();
    await expect(current).toHaveAttribute('type', 'password');
  });
});

test.describe('Password change request', () => {
  test('cancelling the confirmation sends nothing and keeps the typed passwords', async ({ page }) => {
    const routeCallLog: string[] = [];
    const { settings } = await openSettings(page, { routeCallLog });
    await settings.fillPasswords(CURRENT, NEXT, NEXT);

    await settings.changePasswordButton().click();
    await settings.confirmDialog('Confirm password change').getByRole('button', { name: 'Cancel' }).click();

    await expect(settings.confirmDialog('Confirm password change')).toBeHidden();
    await expect(page.locator('#change-password-new')).toHaveValue(NEXT);
    expect(routeCallLog).not.toContain(CHANGE_PASSWORD);
  });

  test('sends the three passwords once confirmed, then toasts and empties the fields', async ({ page }) => {
    const { settings } = await openSettings(page);
    const changeRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/profile/change-password');

    await settings.submitPasswordChange(CURRENT, NEXT, NEXT);

    expect((await changeRequest).postDataJSON()).toEqual({ currentPassword: CURRENT, newPassword: NEXT, confirmNewPassword: NEXT });
    await expect(toastMessage(page, 'Password changed successfully.')).toBeVisible();
    await expect(page.locator('#change-password-current')).toHaveValue('');
    await expect(page.locator('#change-password-new')).toHaveValue('');
    await expect(page.locator('#change-password-confirm')).toHaveValue('');
    await expect(settings.changePasswordButton()).toBeDisabled();
  });
});

test.describe('Password change refusals', () => {
  test('a wrong current password is shown under the current field and cleared by editing it', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { [CHANGE_PASSWORD]: { status: 400, body: { errors: { CurrentPassword: ['Current password is invalid.'] } } } },
    });
    const current = page.locator('#change-password-current');

    await settings.submitPasswordChange(CURRENT, NEXT, NEXT);

    await expect(current).toHaveAttribute('aria-invalid', 'true');
    await expect(current).toHaveAccessibleDescription('Current password is invalid.');
    await expect(errorToastMessage(page, 'Current password is invalid.')).toBeVisible();
    await expect(page.locator('#change-password-new')).toHaveValue(NEXT);

    await settings.fillPasswords('AnotherPass1!', NEXT, NEXT);
    await expect(current).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('a wrong current password that arrives as a plain detail still lands on the current field', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { [CHANGE_PASSWORD]: { status: 400, body: { detail: 'Current password is invalid.' } } },
    });

    await settings.submitPasswordChange(CURRENT, NEXT, NEXT);

    await expect(page.locator('#change-password-current')).toHaveAccessibleDescription('Current password is invalid.');
  });

  for (const refusal of POLICY_REFUSALS) {
    test(`a new password without ${refusal.rule} is refused under the new-password field`, async ({ page }) => {
      const { settings } = await openSettings(page, {
        routeFailures: { [CHANGE_PASSWORD]: { status: 400, body: { errors: { PasswordPolicy: [refusal.serverMessage] } } } },
      });

      await settings.submitPasswordChange(CURRENT, 'weakpassword', 'weakpassword');

      await expect(page.locator('#change-password-new')).toHaveAccessibleDescription(refusal.shown);
      await expect(errorToastMessage(page, refusal.shown)).toBeVisible();
      await expect(page.locator('#change-password-current')).not.toHaveAttribute('aria-invalid', 'true');
    });
  }

  test('an unknown refusal only toasts the generic failure and marks no field', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { [CHANGE_PASSWORD]: { status: 400, body: { detail: 'Something unexpected happened.' } } },
    });

    await settings.submitPasswordChange(CURRENT, NEXT, NEXT);

    await expect(errorToastMessage(page, 'Failed to change password.')).toBeVisible();
    for (const id of ['current', 'new', 'confirm']) {
      await expect(page.locator(`#change-password-${id}`)).not.toHaveAttribute('aria-invalid', 'true');
    }
  });

  test('a locked-out account is refused with an error alert and keeps the typed passwords', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { [CHANGE_PASSWORD]: { status: 429, body: { code: 'lockout_active', retryAfterSeconds: 900 } } },
    });

    await settings.submitPasswordChange(CURRENT, NEXT, NEXT);

    await expect(toastRegion(page).getByRole('alert')).toBeVisible();
    await expect(toastMessage(page, 'Password changed successfully.')).toHaveCount(0);
    await expect(page.locator('#change-password-new')).toHaveValue(NEXT);
  });
});
