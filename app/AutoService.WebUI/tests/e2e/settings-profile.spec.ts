/** Profile edit on Settings: the save gating, the input filters, the confirmed save, and every server refusal
 * (taken email or phone, a blank required name) shown under its field. */
import { expect, test, type Page } from '@playwright/test';
import { openSettings, type SettingsPage } from './pages/settings.page';
import { errorToastMessage, toastMessage } from './support/toast';

const EMAIL_TAKEN = 'An account already exists with this email address.';
const PHONE_TAKEN = 'An account already exists with this phone number.';

test.describe('Profile form', () => {
  test('keeps saving disabled, with the reason, until a field really differs', async ({ page }) => {
    const { settings } = await openSettings(page);
    const save = settings.saveProfileButton();

    await expect(save).toBeDisabled();
    await expect(settings.personalSection).toContainText('Change at least one profile field to enable saving.');

    // The mock first name 'E2E' holds a digit the name filter drops, so the round trip uses the last name.
    await settings.lastName.fill('Changed');
    await expect(save).toBeEnabled();

    await settings.lastName.fill('Mechanic');
    await expect(save).toBeDisabled();
  });

  test('filters what can be typed into the name and phone fields', async ({ page }) => {
    const { settings } = await openSettings(page);

    await settings.firstName.fill('Jan3 K@');
    await settings.middleName.fill("O'Neil 7");
    await settings.phone.fill('abc+36 30-12x(4)');

    await expect(settings.firstName).toHaveValue('JanK');
    await expect(settings.middleName).toHaveValue('ONeil');
    await expect(settings.phone).toHaveValue('+36 30-12(4)');
  });

  test('asks for confirmation, saves the edit, and the sidebar and form show the stored profile', async ({ page }) => {
    const { settings } = await openSettings(page);
    await settings.firstName.fill('Updated');
    await settings.lastName.fill('Person-Name');

    const saveRequest = page.waitForRequest((request) => request.method() === 'PUT' && new URL(request.url()).pathname === '/api/profile');
    await settings.saveProfileButton().click();
    const dialog = settings.confirmDialog('Confirm changes');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    expect((await saveRequest).postDataJSON()).toMatchObject({ firstName: 'Updated', lastName: 'Person-Name' });
    await expect(toastMessage(page, 'Profile updated successfully.')).toBeVisible();
    await expect(page.locator('aside:visible').getByText('Updated Person-Name', { exact: true })).toBeVisible();
    await expect(settings.firstName).toHaveValue('Updated');
    await expect(settings.saveProfileButton()).toBeDisabled();
  });

  test('cancelling the confirmation sends nothing and keeps the edit', async ({ page }) => {
    const routeCallLog: string[] = [];
    const { settings } = await openSettings(page, { routeCallLog });
    await settings.firstName.fill('Draft');

    await settings.saveProfileButton().click();
    await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Cancel' }).click();

    await expect(settings.confirmDialog('Confirm changes')).toBeHidden();
    await expect(settings.firstName).toHaveValue('Draft');
    expect(routeCallLog).not.toContain('PUT /api/profile');
  });
});

/** Opens Settings with the next profile save refused, applies the edit and confirms the save. */
async function saveWithFailure(
  page: Page,
  failure: { status: number; body: unknown },
  edit: (settings: SettingsPage) => Promise<void>,
): Promise<SettingsPage> {
  const { settings } = await openSettings(page, { routeFailures: { 'PUT /api/profile': failure } });
  await edit(settings);
  await settings.saveProfileButton().click();
  await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();
  return settings;
}

test.describe('Profile server refusals', () => {
  test('a taken email is shown under the email field and the edit stays', async ({ page }) => {
    const settings = await saveWithFailure(
      page,
      { status: 400, body: { errors: { Email: [EMAIL_TAKEN] } } },
      async (form) => { await form.email.fill('taken@example.test'); },
    );

    await expect(settings.email).toHaveAttribute('aria-invalid', 'true');
    await expect(settings.email).toHaveAccessibleDescription(EMAIL_TAKEN);
    await expect(errorToastMessage(page, EMAIL_TAKEN)).toBeVisible();
    await expect(settings.email).toHaveValue('taken@example.test');

    await settings.email.fill('free@example.test');
    await expect(settings.email).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('a taken phone number is shown under the phone field', async ({ page }) => {
    const settings = await saveWithFailure(
      page,
      { status: 400, body: { errors: { PhoneNumber: [PHONE_TAKEN] } } },
      async (form) => { await form.phone.fill('+36 30 111 2222'); },
    );

    await expect(settings.phone).toHaveAccessibleDescription(PHONE_TAKEN);
    await expect(settings.email).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('a conflict that names no field is placed under the email field', async ({ page }) => {
    const settings = await saveWithFailure(
      page,
      { status: 409, body: { detail: 'An account already exists with this email address or phone number.' } },
      async (form) => { await form.email.fill('race@example.test'); },
    );

    await expect(settings.email).toHaveAccessibleDescription(EMAIL_TAKEN);
    await expect(errorToastMessage(page, EMAIL_TAKEN)).toBeVisible();
  });

  test('a blank required name is restored from the profile and the refusal is toasted', async ({ page }) => {
    const settings = await saveWithFailure(
      page,
      { status: 400, body: { errors: { FirstName: ['First name cannot be empty.'] } } },
      async (form) => { await form.firstName.fill(''); },
    );

    await expect(errorToastMessage(page, 'This field is required.')).toBeVisible();
    await expect(settings.firstName).toHaveValue('E2E');
  });

  test('an answer without field errors only toasts the generic failure', async ({ page }) => {
    const settings = await saveWithFailure(
      page,
      { status: 400, body: {} },
      async (form) => { await form.lastName.fill('Other'); },
    );

    await expect(errorToastMessage(page, 'Failed to update profile.')).toBeVisible();
    await expect(settings.lastName).not.toHaveAttribute('aria-invalid', 'true');
    await expect(settings.lastName).toHaveValue('Other');
  });
});
