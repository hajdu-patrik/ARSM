/** A 429 lockout_active answer to the password change and the profile deletion: both toast the wait in whole
 * minutes (EN and HU) from the shared lockout text, mark no field and keep the typed passwords and the session. */
import { expect, test } from '@playwright/test';
import { openSettings } from './pages/settings.page';
import type { TestLanguage } from './support/browser-state';
import { errorToastMessage, toastMessage } from './support/toast';

const CHANGE_PASSWORD = 'POST /api/profile/change-password';
const DELETE_PROFILE = 'DELETE /api/profile';
const CURRENT = 'CurrentPass1!';
const NEXT = 'NewPassWord1!';
const HINT_KEY = 'arsm.auth.sessionHint';

const LOCKOUT_TEXT: Record<TestLanguage, { wait: string; noWait: string }> = {
  en: { wait: 'Too many attempts. Try again in 14 minutes.', noWait: 'Too many attempts. Please try again later.' },
  hu: { wait: 'Túl sok próbálkozás. Próbálja újra 14 perc múlva.', noWait: 'Túl sok próbálkozás. Próbálja újra később.' },
};

test.describe('Password change lockout', () => {
  for (const language of ['en', 'hu'] as const) {
    test(`toasts the 14 minute wait in ${language}, marks no field and keeps the typed passwords`, async ({ page }) => {
      const { settings } = await openSettings(
        page,
        { routeFailures: { [CHANGE_PASSWORD]: { status: 429, body: { code: 'lockout_active', retryAfterSeconds: 840 } } } },
        language,
      );

      await settings.submitPasswordChange(CURRENT, NEXT, NEXT);

      await expect(errorToastMessage(page, LOCKOUT_TEXT[language].wait)).toBeVisible();
      for (const id of ['current', 'new', 'confirm']) {
        await expect(page.locator(`#change-password-${id}`)).not.toHaveAttribute('aria-invalid', 'true');
      }
      await expect(page.locator('#change-password-new')).toHaveValue(NEXT);
      await expect(toastMessage(page, /Password changed|Jelszó sikeresen/)).toHaveCount(0);
      await expect(page).toHaveURL(/\/settings$/);
    });
  }

  test('asks to try later when the lockout names no wait', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { [CHANGE_PASSWORD]: { status: 429, body: { code: 'lockout_active' } } },
    });

    await settings.submitPasswordChange(CURRENT, NEXT, NEXT);

    await expect(errorToastMessage(page, LOCKOUT_TEXT.en.noWait)).toBeVisible();
    await expect(errorToastMessage(page, 'Failed to change password.')).toHaveCount(0);
  });
});

test.describe('Profile deletion lockout', () => {
  for (const language of ['en', 'hu'] as const) {
    test(`toasts the 14 minute wait in ${language} and keeps the dialog, the field state and the session`, async ({ page }) => {
      const { settings } = await openSettings(
        page,
        { routeFailures: { [DELETE_PROFILE]: { status: 429, body: { code: 'lockout_active', retryAfterSeconds: 840 } } } },
        language,
      );
      const dialog = await settings.openDeleteDialog();
      await settings.fillDeletePasswords(CURRENT, CURRENT);

      await settings.deleteConfirmButton(dialog).click();

      await expect(errorToastMessage(page, LOCKOUT_TEXT[language].wait)).toBeVisible();
      await expect(dialog).toBeVisible();
      await expect(page.locator('#delete-profile-password')).not.toHaveAttribute('aria-invalid', 'true');
      await expect(page).toHaveURL(/\/settings$/);
      expect(await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)).toBe('1');
    });
  }

  test('asks to try later when the lockout names no wait', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { [DELETE_PROFILE]: { status: 429, body: { code: 'lockout_active' } } },
    });
    const dialog = await settings.openDeleteDialog();
    await settings.fillDeletePasswords(CURRENT, CURRENT);

    await settings.deleteConfirmButton(dialog).click();

    await expect(errorToastMessage(page, LOCKOUT_TEXT.en.noWait)).toBeVisible();
    await expect(errorToastMessage(page, 'Failed to delete profile.')).toHaveCount(0);
  });
});
