/** Admin password reset on the mechanic roster: the action sits on non-admin rows only, its dialog needs a
 * password of at least 8 characters, and the server's answers (success, policy refusal, 403) reach the user. */
import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { fillLockedPasswordField } from './support/password-fields';
import { MOCK_MECHANIC_IDS, type MockApiState } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

const PETER_EMAIL = 'peter.nagy@example.com';

/** Opens the roster as an admin; the fixture roster is one admin and three mechanics on a single page. */
async function openRoster(page: Page): Promise<MockApiState> {
  await primeBrowserState(page, { sessionHint: true });
  const state = await installApiMocks(page, { profileEmail: 'admin.edge@example.test', isAuthenticated: true, isAdmin: true });
  await page.goto('/admin/register');
  await expect(page.locator('#reg-email')).toBeVisible();
  return state;
}

async function openPeterReset(page: Page) {
  await page.getByTestId(`mechanic-row-${String(MOCK_MECHANIC_IDS.peter)}`).getByRole('button', { name: 'Reset password' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset password' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Admin password reset', () => {
  test('is offered on every mechanic row and never on an admin row', async ({ page }) => {
    await openRoster(page);

    await expect(page.getByTestId(`mechanic-row-${String(MOCK_MECHANIC_IDS.admin)}`)).toBeVisible();
    await expect(page.getByTestId(`mechanic-row-${String(MOCK_MECHANIC_IDS.admin)}`).getByRole('button', { name: 'Reset password' })).toHaveCount(0);
    for (const personId of [MOCK_MECHANIC_IDS.gabor, MOCK_MECHANIC_IDS.peter, MOCK_MECHANIC_IDS.mate]) {
      await expect(page.getByTestId(`mechanic-row-${String(personId)}`).getByRole('button', { name: 'Reset password' })).toBeVisible();
    }
  });

  test('keeps the confirm button disabled under 8 characters, then sets the temporary password', async ({ page }) => {
    await openRoster(page);
    const dialog = await openPeterReset(page);
    const confirm = dialog.getByRole('button', { name: 'Reset password' });
    const password = dialog.getByLabel('Temporary password');

    await expect(dialog).toContainText(PETER_EMAIL);
    await expect(dialog).toContainText('Min. 8 characters, with uppercase, lowercase, digit, and special character.');
    await expect(confirm).toBeDisabled();

    await fillLockedPasswordField(password, 'Short1!');
    await expect(confirm).toBeDisabled();

    await fillLockedPasswordField(password, 'TempPass1!');
    await expect(confirm).toBeEnabled();

    const request = page.waitForRequest((candidate) => candidate.method() === 'POST' && candidate.url().endsWith(`/api/admin/mechanics/${String(MOCK_MECHANIC_IDS.peter)}/password-reset`));
    await confirm.click();

    expect((await request).postDataJSON()).toEqual({ temporaryPassword: 'TempPass1!' });
    await expect(toastMessage(page, `Temporary password set for ${PETER_EMAIL}; it must be changed at the next login.`)).toBeVisible();
    await expect(dialog).toHaveCount(0);
  });

  test('shows the password policy refusal under the field and keeps the dialog open', async ({ page }) => {
    await openRoster(page);
    const dialog = await openPeterReset(page);
    const password = dialog.getByLabel('Temporary password');

    await fillLockedPasswordField(password, 'nouppercase1!');
    await dialog.getByRole('button', { name: 'Reset password' }).click();

    await expect(errorToastMessage(page, 'Password must contain at least one uppercase letter.')).toBeVisible();
    await expect(password).toHaveAttribute('aria-invalid', 'true');
    await expect(password).toHaveAccessibleDescription(/Password must contain at least one uppercase letter\./);
    await expect(dialog).toBeVisible();

    await password.fill('NoUppercase1!');
    await expect(password).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('toasts a 403 when the server refuses the reset', async ({ page }) => {
    const state = await openRoster(page);
    const dialog = await openPeterReset(page);

    // Peter was made an admin meanwhile, whose password an admin cannot reset.
    const peter = state.mechanics.find((mechanic) => mechanic.personId === MOCK_MECHANIC_IDS.peter);
    if (peter === undefined) {
      throw new Error('Peter is part of the fixture roster.');
    }
    peter.isAdmin = true;

    await fillLockedPasswordField(dialog.getByLabel('Temporary password'), 'TempPass1!');
    await dialog.getByRole('button', { name: 'Reset password' }).click();

    await expect(errorToastMessage(page, "You do not have permission to reset this mechanic's password.")).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});
