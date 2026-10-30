/** Mechanic registration form: when Submit is enabled, the input filters, the password toggles, the
 * confirmation step, the request payload and the reset after a success. */
import { expect, test } from '@playwright/test';
import { AdminPage, REGISTER_PASSWORD } from './pages/admin.page';
import { selectDropdownOptionByLabel } from './support/dropdown';
import { toastMessage } from './support/toast';

const NEW_EMAIL = 'form.mechanic@example.test';

test.describe('Registration form', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    ({ adminPage } = await AdminPage.open(page));
  });

  test('enables Submit only once every required field is valid', async ({ page }) => {
    await expect(adminPage.submit()).toBeDisabled();
    await adminPage.firstName().fill('Edge');
    await adminPage.lastName().fill('Mechanic');
    await adminPage.email().fill(NEW_EMAIL);
    await adminPage.password().fill(REGISTER_PASSWORD);
    await adminPage.confirmPassword().fill(REGISTER_PASSWORD);
    await expect(adminPage.submit()).toBeDisabled();

    await selectDropdownOptionByLabel(page, adminPage.specialization(), 'Petrol & diesel');
    await expect(adminPage.submit()).toBeDisabled();

    await adminPage.engineTile().click();
    await expect(adminPage.submit()).toBeEnabled();

    await adminPage.engineTile().click();
    await expect(adminPage.submit()).toBeDisabled();
  });

  test('keeps Submit disabled for a password under 8 characters', async () => {
    await adminPage.fillRequired({ email: NEW_EMAIL, password: 'Short1!', confirmPassword: 'Short1!' });

    await expect(adminPage.submit()).toBeDisabled();

    await adminPage.password().fill(REGISTER_PASSWORD);
    await adminPage.confirmPassword().fill(REGISTER_PASSWORD);
    await expect(adminPage.submit()).toBeEnabled();
  });

  test('lets names keep letters and hyphens only and the phone keep digits and phone symbols', async () => {
    await adminPage.firstName().fill('Jo3hn-Ma ry!');
    await adminPage.middleName().fill('Van 2');
    await adminPage.lastName().fill('Do_e');
    await adminPage.phone().fill('+36a30b1234567');

    await expect(adminPage.firstName()).toHaveValue('John-Mary');
    await expect(adminPage.middleName()).toHaveValue('Van');
    await expect(adminPage.lastName()).toHaveValue('Doe');
    await expect(adminPage.phone()).toHaveValue('+36301234567');
  });

  test('toggles the visibility of the password and of the confirmation separately', async ({ page }) => {
    await expect(adminPage.password()).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show', exact: true }).first().click();

    await expect(adminPage.password()).toHaveAttribute('type', 'text');
    await expect(adminPage.confirmPassword()).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Hide', exact: true }).click();
    await expect(adminPage.password()).toHaveAttribute('type', 'password');
  });

  test('shows the registered e-mail in the confirmation, and Cancel sends nothing and keeps the form', async ({ page }) => {
    const registrations: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/register') {
        registrations.push(request.url());
      }
    });
    await adminPage.fillRequired({ email: NEW_EMAIL });
    await adminPage.submit().click();

    const dialog = adminPage.confirmDialog();
    await expect(dialog).toContainText(`Register mechanic ${NEW_EMAIL}?`);
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(adminPage.email()).toHaveValue(NEW_EMAIL);
    await expect(adminPage.submit()).toBeEnabled();
    expect(registrations).toEqual([]);
  });

  test('sends the trimmed fields with the optional ones, then empties the form and lists the mechanic', async ({ page }) => {
    await adminPage.fillRequired({ email: NEW_EMAIL, firstName: 'Edge', lastName: 'Mechanic' });
    await adminPage.middleName().fill('Van-Der');
    await adminPage.phone().fill('+36301234567');
    await adminPage.submit().click();

    const request = page.waitForRequest((candidate) => candidate.method() === 'POST' && new URL(candidate.url()).pathname === '/api/auth/register');
    await adminPage.confirmDialog().getByRole('button', { name: 'Register', exact: true }).click();

    expect((await request).postDataJSON()).toEqual({
      personType: 'mechanic',
      firstName: 'Edge',
      middleName: 'Van-Der',
      lastName: 'Mechanic',
      email: NEW_EMAIL,
      password: REGISTER_PASSWORD,
      phoneNumber: '+36301234567',
      specialization: 'GasolineAndDiesel',
      expertise: ['Engine'],
    });
    await expect(toastMessage(page, `Mechanic "${NEW_EMAIL}" registered successfully.`)).toBeVisible();
    await expect(adminPage.roster().getByText(NEW_EMAIL, { exact: true })).toBeVisible();
    await expect(adminPage.firstName()).toHaveValue('');
    await expect(adminPage.email()).toHaveValue('');
    await expect(adminPage.password()).toHaveValue('');
    await expect(adminPage.specialization()).toHaveText('Select specialization...');
    await expect(adminPage.engineExpertise()).not.toBeChecked();
    await expect(adminPage.submit()).toBeDisabled();
  });
});
