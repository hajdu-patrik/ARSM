/** Company data on Settings (admin only): the letterhead read, the client-side rules, the trimmed save and the
 * server's field errors. */
import { expect, test, type Locator } from '@playwright/test';
import { openSettings, type SettingsPage } from './pages/settings.page';
import { errorToastMessage, toastMessage } from './support/toast';

const COMPANY_PROFILE = 'PUT /api/admin/company-profile';

function field(settings: SettingsPage, label: string): Locator {
  return settings.companySection.getByLabel(label, { exact: true });
}

function saveButton(settings: SettingsPage): Locator {
  return settings.companySection.getByRole('button', { name: 'Save changes' });
}

test.describe('Company data form', () => {
  test('shows the stored letterhead and keeps saving disabled until a field changes', async ({ page }) => {
    const { settings } = await openSettings(page, { isAdmin: true });

    await expect(field(settings, 'Company name')).toHaveValue('ARSM Auto Kft.');
    await expect(field(settings, 'Postal code')).toHaveValue('1111');
    await expect(field(settings, 'Tax number')).toHaveValue('12345678-1-12');
    await expect(saveButton(settings)).toBeDisabled();
    await expect(settings.companySection).toContainText('Change at least one company data field to enable saving.');

    await field(settings, 'City').fill('Szeged');
    await expect(saveButton(settings)).toBeEnabled();
  });

  test('a failed read toasts the load error', async ({ page }) => {
    await openSettings(page, {
      isAdmin: true,
      routeFailures: { 'GET /api/admin/company-profile': { status: 400, body: {}, repeat: true } },
    });

    await expect(errorToastMessage(page, 'Failed to load company data.')).toBeVisible();
  });

  const INVALID_VALUES = [
    { label: 'Company name', value: '   ', message: 'This field is required.' },
    { label: 'Tax number', value: '123', message: 'Tax number must look like 12345678-1-12.' },
    { label: 'Postal code', value: '12a', message: 'Postal code must be exactly 4 digits.' },
    { label: 'Email', value: 'not-an-email', message: 'Email must be a valid email address.' },
    { label: 'Phone number', value: '12', message: 'Phone number must be a valid European number.' },
  ];

  for (const invalid of INVALID_VALUES) {
    test(`refuses "${invalid.value.trim()}" in ${invalid.label} before any request`, async ({ page }) => {
      const routeCallLog: string[] = [];
      const { settings } = await openSettings(page, { isAdmin: true, routeCallLog });
      const input = field(settings, invalid.label);

      await input.fill(invalid.value);
      await saveButton(settings).click();

      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(input).toHaveAccessibleDescription(invalid.message);
      await expect(settings.confirmDialog('Confirm changes')).toHaveCount(0);
      expect(routeCallLog).not.toContain(COMPANY_PROFILE);
    });
  }

  test('saves the trimmed values after the confirmation and shows the stored row', async ({ page }) => {
    const { settings, state } = await openSettings(page, { isAdmin: true });
    await field(settings, 'City').fill('  Szeged  ');
    await field(settings, 'Postal code').fill('6720');
    const saveRequest = page.waitForRequest((request) => request.method() === 'PUT' && new URL(request.url()).pathname === '/api/admin/company-profile');

    await saveButton(settings).click();
    await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();

    expect((await saveRequest).postDataJSON()).toMatchObject({ city: 'Szeged', postalCode: '6720', name: 'ARSM Auto Kft.' });
    await expect(toastMessage(page, 'Company data updated successfully.')).toBeVisible();
    await expect(field(settings, 'City')).toHaveValue('Szeged');
    await expect(saveButton(settings)).toBeDisabled();
    expect(state.companyProfile.city).toBe('Szeged');
  });

  test('a server field error lands under its field', async ({ page }) => {
    const { settings } = await openSettings(page, {
      isAdmin: true,
      routeFailures: { [COMPANY_PROFILE]: { status: 400, body: { errors: { TaxNumber: ['Tax number must look like 12345678-1-12.'] } } } },
    });
    await field(settings, 'Company name').fill('Renamed Kft.');

    await saveButton(settings).click();
    await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();

    const taxNumber = field(settings, 'Tax number');
    await expect(taxNumber).toHaveAccessibleDescription('Tax number must look like 12345678-1-12.');
    await expect(errorToastMessage(page, 'Tax number must look like 12345678-1-12.')).toBeVisible();
    await expect(field(settings, 'Company name')).toHaveValue('Renamed Kft.');
  });

  test('an answer without field errors toasts the generic failure', async ({ page }) => {
    const { settings } = await openSettings(page, {
      isAdmin: true,
      routeFailures: { [COMPANY_PROFILE]: { status: 400, body: {} } },
    });
    await field(settings, 'City').fill('Szeged');

    await saveButton(settings).click();
    await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();

    await expect(errorToastMessage(page, 'Failed to update company data.')).toBeVisible();
  });
});
