import { expect, test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { SchedulerPage } from './pages/scheduler.page';
import { lookupCustomerWithVehicle } from './support/appointment-fixtures';
import { serveLookupAnswer } from './support/appointment-route-overrides';
import { expectDropdownValue } from './support/dropdown';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import { signInWithMocks } from './support/sign-in';
import { toastMessage } from './support/toast';

test.describe('Scheduler intake customer lookup', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail });
    await new AuthPage(page).loginAsMechanic(env);
  });

  test('finds a customer by exact vehicle license plate and preselects the matched vehicle', async ({ page }) => {
    const schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
    const dialog = await schedulerPage.openIntakeForCurrentDay();

    await schedulerPage.searchByLicensePlate('NXE-441');
    // The plate filter lists vehicles; the two name matches below list customers in the plural.
    await expect(dialog.getByText('1 matching vehicle', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Volkswagen Golf', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Select' }).first().click();

    await expect(dialog.getByText('Existing customer selected')).toBeVisible();
    await expect(dialog.getByText('anna.kovacs@example.test')).toBeVisible();
    await expectDropdownValue(page, 'scheduler-intake-existing-vehicle', '1001');
    await expect(dialog.getByTestId('scheduler-intake-existing-vehicle')).toContainText('NXE-441 - Volkswagen Golf (2018)');
  });

  test('preselects the vehicle of the chosen plate row, not the first vehicle of its owner', async ({ page }) => {
    const schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
    const dialog = await schedulerPage.openIntakeForCurrentDay();

    await schedulerPage.searchByLicensePlate('PHE-220');
    await expect(dialog.getByText('1 matching vehicle', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Select' }).first().click();

    await expect(dialog.getByTestId('scheduler-intake-existing-vehicle')).toContainText('PHE-220');
  });

  test('creates an intake for an existing vehicle and adds it to the monthly list', async ({ page }) => {
    const schedulerPage = new SchedulerPage(page);
    const taskDescription = 'Brake diagnosis from Playwright';

    await schedulerPage.goto();
    const dialog = await schedulerPage.openIntakeForCurrentDay();

    await schedulerPage.searchByLicensePlate('NXE-441');
    await dialog.getByRole('button', { name: 'Select' }).first().click();
    await dialog.getByTestId('scheduler-intake-task-description').fill(taskDescription);
    await schedulerPage.createWithCurrentForm();

    await expect(schedulerPage.intakeDialog()).toHaveCount(0);
    await expect(toastMessage(page, 'Intake created successfully.')).toBeVisible();
    await expect(page.getByText(taskDescription)).toBeVisible();
    await expect(page.getByText('NXE-441').first()).toBeVisible();
    await expect(page.getByText('1 appointment', { exact: true })).toBeVisible();
  });

  test('shows multiple name lookup results and selects one customer', async ({ page }) => {
    const schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
    const dialog = await schedulerPage.openIntakeForCurrentDay();

    await schedulerPage.searchByName('Kovacs');

    await expect(dialog.getByText('2 matching customers')).toBeVisible();
    await expect(dialog.getByText('Anna Kovacs')).toBeVisible();
    await expect(dialog.getByText('Adam Kovacs')).toBeVisible();

    await dialog.getByRole('button', { name: 'Select' }).nth(1).click();

    await expect(dialog.getByText('Existing customer selected')).toBeVisible();
    await expect(dialog.getByText('adam.kovacs@example.test')).toBeVisible();
    await expectDropdownValue(page, 'scheduler-intake-existing-vehicle', '1004');
  });
});

test.describe('Scheduler intake new vehicle validation', () => {
  test('uses localized VIN, kW, and drivetrain fields for new vehicle validation', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail });
    await new AuthPage(page).loginAsMechanic(env, 'hu');

    const schedulerPage = new SchedulerPage(page);
    await schedulerPage.goto();
    const dialog = await schedulerPage.openIntakeForCurrentDay();

    await schedulerPage.searchMissingEmail('new.customer@example.test');

    await expect(dialog.getByText('Nincs találat erre a névre')).toBeVisible();
    await expect(dialog.getByLabel('VIN')).toBeVisible();
    await expect(dialog.getByLabel('Motorteljesítmény (kW)')).toBeVisible();
    await expect(dialog.getByLabel('Hajtáslánc')).toBeVisible();
    await expect(dialog).not.toContainText(/HP|Torque|Lóerő|Nyomaték/i);

    await dialog.getByLabel(/Ügyfél e-mail|Customer email/).fill('new.customer@example.test');
    await dialog.getByTestId('scheduler-intake-task-description').fill('Fékbetét csere és átvizsgálás');
    await schedulerPage.createWithCurrentForm();

    await expect(page.getByText('A rendszám, VIN, márka, modell és hajtáslánc megadása kötelező.')).toBeVisible();
  });
});

test.describe('Scheduler intake lookup keeps what the server found', () => {
  const PLATE_OWNER = lookupCustomerWithVehicle({ id: 210, firstName: 'Pal', middleName: null, lastName: 'Varga', licensePlate: 'PRB-001' });
  const MIDDLE_NAME_OWNER = lookupCustomerWithVehicle({ id: 211, firstName: 'Zoltan', middleName: 'Bela', lastName: 'Szabo', licensePlate: 'MDL-211' });

  for (const typedPlate of ['PRB001', 'PRB 001']) {
    test(`lists the PRB-001 vehicle for the plate typed as "${typedPlate}" and offers no new customer`, async ({ page }) => {
      await signInWithMocks(page);
      await serveLookupAnswer(page, [PLATE_OWNER]);
      const scheduler = new SchedulerPage(page);
      await scheduler.goto();
      const dialog = await scheduler.openIntakeForCurrentDay();

      await scheduler.searchByLicensePlate(typedPlate);

      await expect(dialog.getByText('1 matching vehicle', { exact: true })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Select' })).toHaveCount(1);
      await expect(dialog.getByText('No customer found for this license plate')).toHaveCount(0);
      await expect(dialog.getByTestId('scheduler-intake-customer-email')).toHaveCount(0);
    });
  }

  for (const typedName of ['Zoltan Bela Szabo', 'Szabo Zoltan Bela']) {
    test(`lists the customer with a middle name for the name typed as "${typedName}"`, async ({ page }) => {
      await signInWithMocks(page);
      await serveLookupAnswer(page, [MIDDLE_NAME_OWNER]);
      const scheduler = new SchedulerPage(page);
      await scheduler.goto();
      const dialog = await scheduler.openIntakeForCurrentDay();

      await scheduler.searchByName(typedName);

      await expect(dialog.getByText('1 matching customer', { exact: true })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Select' })).toHaveCount(1);
      await expect(dialog.getByText('No customers match this name')).toHaveCount(0);
      await expect(dialog.getByTestId('scheduler-intake-customer-email')).toHaveCount(0);
    });
  }
});
