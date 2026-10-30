/** Admin password reset on the roster: the action sits on non-admin rows only, the dialog needs 8 characters,
 * and the server's answers (success, policy refusals, 403, 404, mail not sent) reach the user. */
import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { fulfillJson } from './support/api-mock-response';
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

/** Clicks Peter's reset action and returns the opened dialog. */
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
    await expect(toastMessage(page, `Temporary password set and e-mailed to ${PETER_EMAIL}.`)).toBeVisible();
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

const POLICY_REFUSALS = [
  { password: 'TEMPPASS1!', message: 'Password must contain at least one lowercase letter.' },
  { password: 'TempPass!!', message: 'Password must contain at least one number.' },
  { password: 'TempPass12', message: 'Password must contain at least one special character.' },
] as const;

test.describe('Admin password reset: more server answers', () => {
  for (const { password, message } of POLICY_REFUSALS) {
    test(`shows "${message}" under the field for ${password}`, async ({ page }) => {
      await openRoster(page);
      const dialog = await openPeterReset(page);
      const field = dialog.getByLabel('Temporary password');

      await fillLockedPasswordField(field, password);
      await dialog.getByRole('button', { name: 'Reset password' }).click();

      await expect(errorToastMessage(page, message)).toBeVisible();
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(field).toHaveAccessibleDescription(new RegExp(message.replace('.', String.raw`\.`)));
      await expect(dialog).toBeVisible();
    });
  }

  test('warns to hand the password over when the e-mail did not go out, and still closes the dialog', async ({ page }) => {
    await openRoster(page);
    await page.route((url) => url.pathname.endsWith('/password-reset'), async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, { emailSent: false, email: PETER_EMAIL });
    });
    const dialog = await openPeterReset(page);

    await fillLockedPasswordField(dialog.getByLabel('Temporary password'), 'TempPass1!');
    await dialog.getByRole('button', { name: 'Reset password' }).click();

    await expect(toastMessage(page, `Temporary password set, but the e-mail could not be sent to ${PETER_EMAIL}; hand it over manually.`)).toBeVisible();
    await expect(errorToastMessage(page, /./)).toHaveCount(0);
    await expect(dialog).toHaveCount(0);
  });

  test('toasts a plain failure, with no field marked, when the mechanic is gone', async ({ page }) => {
    const state = await openRoster(page);
    const dialog = await openPeterReset(page);
    state.mechanics.splice(state.mechanics.findIndex((mechanic) => mechanic.personId === MOCK_MECHANIC_IDS.peter), 1);

    const field = dialog.getByLabel('Temporary password');
    await fillLockedPasswordField(field, 'TempPass1!');
    await dialog.getByRole('button', { name: 'Reset password' }).click();

    await expect(errorToastMessage(page, 'Failed to reset the password.')).toBeVisible();
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
    await expect(dialog).toBeVisible();
  });

  test('Cancel and Escape close the dialog without a request, and it reopens with an empty field', async ({ page }) => {
    await openRoster(page);
    const resets: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/password-reset')) {
        resets.push(request.url());
      }
    });
    const dialog = await openPeterReset(page);
    await fillLockedPasswordField(dialog.getByLabel('Temporary password'), 'TempPass1!');

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    const reopened = await openPeterReset(page);
    await expect(reopened.getByLabel('Temporary password')).toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(reopened).toHaveCount(0);
    expect(resets).toEqual([]);
  });

  test('shows and hides the typed password', async ({ page }) => {
    await openRoster(page);
    const dialog = await openPeterReset(page);
    const field = dialog.getByLabel('Temporary password');
    await fillLockedPasswordField(field, 'TempPass1!');

    await expect(field).toHaveAttribute('type', 'password');
    await dialog.getByRole('button', { name: 'Show password' }).click();
    await expect(field).toHaveAttribute('type', 'text');
    await dialog.getByRole('button', { name: 'Hide password' }).click();
    await expect(field).toHaveAttribute('type', 'password');
  });
});
