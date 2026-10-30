/** Scheduler intake by customer kind: a new customer with a new vehicle, an existing customer with a new or another
 * vehicle, a customer without vehicles, the lookup misses and failures, and the input rules of the form. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { SchedulerCreateIntakeRequest } from '../../src/types/scheduler/scheduler.types';
import { SchedulerPage } from './pages/scheduler.page';
import { recordRequestBodies, refuseApiRoute } from './support/appointment-route-overrides';
import { toDatetimeLocalValue } from './support/appointment-fixtures';
import { selectDropdownOption } from './support/dropdown';
import { signInWithMocks } from './support/sign-in';
import type { MockApiState } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

const NEW_VEHICLE = {
  licensePlate: 'abc-123',
  vin: 'WVWZZZAUZJW999999',
  brand: 'Skoda',
  model: 'Fabia',
  year: '2020',
  mileageKm: '15000',
  enginePowerKw: '90',
  drivetrain: 'Diesel',
} as const;

const EXPECTED_VEHICLE = {
  licensePlate: 'ABC-123',
  vin: 'WVWZZZAUZJW999999',
  brand: 'Skoda',
  model: 'Fabia',
  year: 2020,
  mileageKm: 15000,
  enginePowerKw: 90,
  drivetrainType: 'Diesel',
} as const;

interface OpenIntake {
  readonly state: MockApiState;
  readonly scheduler: SchedulerPage;
  readonly dialog: Locator;
  readonly bodies: SchedulerCreateIntakeRequest[];
}

/** Signs in, starts recording intake requests and opens the intake dialog for today. */
async function openIntake(page: Page): Promise<OpenIntake> {
  const state = await signInWithMocks(page);
  const bodies = recordRequestBodies<SchedulerCreateIntakeRequest>(page, 'POST', '/api/appointments/intake');
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();

  return { state, scheduler, bodies, dialog: await scheduler.openIntakeForCurrentDay() };
}

/** The due moment the form proposes: three days after the selected day (today), at 17:00. */
function proposedDue(): string {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 17).toISOString();
}

test.describe('Scheduler intake - new customer', () => {
  test('creates the customer and the vehicle together from a name nobody has', async ({ page }) => {
    const { scheduler, dialog, bodies } = await openIntake(page);

    await scheduler.searchByName('Nobody Atall');
    await expect(dialog.getByText('No customers match this name')).toBeVisible();
    await expect(dialog.getByText('Try another name or license plate, or fill in the new customer details below.')).toBeVisible();
    await dialog.getByTestId('scheduler-intake-customer-email').fill('Kata.Szabo@Example.Test');
    await dialog.getByLabel('First name', { exact: true }).fill('Kata');
    await dialog.getByLabel('Last name', { exact: true }).fill('Szabo-Nagy');
    await dialog.getByLabel('Phone number', { exact: true }).fill('+36301234567');
    await scheduler.fillNewVehicle(NEW_VEHICLE);
    await dialog.getByTestId('scheduler-intake-task-description').fill('Timing belt replacement');
    await scheduler.createWithCurrentForm();

    await expect(scheduler.intakeDialog()).toHaveCount(0);
    await expect(toastMessage(page, 'Intake created successfully.')).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      customerEmail: 'kata.szabo@example.test',
      customerFirstName: 'Kata',
      customerLastName: 'Szabo-Nagy',
      customerPhoneNumber: '+36301234567',
      taskDescription: 'Timing belt replacement',
      dueDateTime: proposedDue(),
      vehicle: EXPECTED_VEHICLE,
    });
    expect(bodies[0]).not.toHaveProperty('vehicleId');
    const card = scheduler.cardFor('Timing belt replacement');
    await expect(card.getByRole('heading', { name: 'Skoda Fabia (2020)' })).toBeVisible();
    await expect(card.getByText('ABC-123', { exact: true })).toBeVisible();
  });

  test('reports a plate with no customer on the plate field and keeps the name field out of the way', async ({ page }) => {
    const { scheduler, dialog } = await openIntake(page);
    const plate = dialog.getByTestId('scheduler-intake-license-plate-lookup');
    const name = dialog.getByTestId('scheduler-intake-name-lookup');

    await scheduler.searchByLicensePlate('zz-999');

    await expect(plate).toHaveValue('ZZ-999');
    await expect(dialog.getByText('No customer found for this license plate')).toBeVisible();
    await expect(plate).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toBeDisabled();
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByTestId('scheduler-intake-customer-email')).toBeVisible();
  });

  test('a failed search toasts the failure and offers no create button', async ({ page }) => {
    const { scheduler, dialog } = await openIntake(page);
    await refuseApiRoute(page, '/api/customers/by-name', 'GET', 400, { detail: 'Bad request.' });

    await scheduler.searchByName('Kovacs');

    await expect(errorToastMessage(page, 'Failed to search customers.')).toBeVisible();
    await expect(dialog.getByTestId('scheduler-intake-create')).toHaveCount(0);
    await expect(dialog.getByText('Customer not found')).toHaveCount(0);
  });
});

test.describe('Scheduler intake - existing customer', () => {
  test('lets an existing customer get a new vehicle instead of one of theirs', async ({ page }) => {
    const { scheduler, dialog, bodies } = await openIntake(page);

    await scheduler.searchByLicensePlate('NXE-441');
    await dialog.getByRole('button', { name: 'Select' }).first().click();
    await dialog.getByRole('button', { name: 'Create new vehicle' }).click();
    await expect(dialog.getByRole('button', { name: 'Create new vehicle' })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByTestId('scheduler-intake-existing-vehicle')).toHaveCount(0);
    await scheduler.fillNewVehicle(NEW_VEHICLE);
    await dialog.getByTestId('scheduler-intake-task-description').fill('Second car check');
    await scheduler.createWithCurrentForm();

    await expect(scheduler.intakeDialog()).toHaveCount(0);
    expect(bodies[0]).toMatchObject({ customerEmail: 'anna.kovacs@example.test', vehicle: EXPECTED_VEHICLE });
    expect(bodies[0]).not.toHaveProperty('vehicleId');
    await expect(scheduler.cardFor('Second car check').getByRole('heading', { name: 'Skoda Fabia (2020)' })).toBeVisible();
  });

  test('sends the other existing vehicle the customer picks', async ({ page }) => {
    const { scheduler, dialog, bodies } = await openIntake(page);

    await scheduler.searchByLicensePlate('NXE-441');
    await dialog.getByRole('button', { name: 'Select' }).first().click();
    await selectDropdownOption(page, 'scheduler-intake-existing-vehicle', '1002');
    await expect(dialog.getByTestId('scheduler-intake-existing-vehicle')).toContainText('PHE-220 - Hyundai Ioniq (2022)');
    await dialog.getByTestId('scheduler-intake-task-description').fill('Other car check');
    await scheduler.createWithCurrentForm();

    await expect(scheduler.intakeDialog()).toHaveCount(0);
    expect(bodies[0]).toMatchObject({ vehicleId: 1002 });
    expect(bodies[0]).not.toHaveProperty('vehicle');
    await expect(scheduler.cardFor('Other car check').getByRole('heading', { name: 'Hyundai Ioniq (2022)' })).toBeVisible();
  });

  test('a customer without vehicles goes straight to the new vehicle form', async ({ page }) => {
    const { state, scheduler, dialog } = await openIntake(page);
    state.schedulerLookupCustomers.push({
      id: 105,
      firstName: 'Vera',
      middleName: null,
      lastName: 'Nova',
      email: 'vera.nova@example.test',
      phoneNumber: null,
      vehicles: [],
    });

    await scheduler.searchByName('Vera');
    await expect(dialog.getByText('1 matching customer', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Vehicles: 0', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Select' }).click();

    await expect(dialog.getByText('Existing customer selected')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Use existing vehicle' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Create new vehicle' })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByLabel('VIN', { exact: true })).toBeVisible();
  });
});

test.describe('Scheduler intake - form rules', () => {
  test('filters names and phone, upper-cases plate and VIN, caps the VIN and clamps the numbers', async ({ page }) => {
    const { scheduler, dialog } = await openIntake(page);
    await scheduler.searchByName('Nobody Atall');
    await expect(dialog.getByTestId('scheduler-intake-customer-email')).toBeVisible();

    await dialog.getByLabel('First name', { exact: true }).fill('Ka1ta_ ');
    await dialog.getByLabel('Last name', { exact: true }).fill('Szabo-Nagy9');
    await dialog.getByLabel('Phone number', { exact: true }).fill('+36a30-1b2');
    await dialog.getByLabel('License plate', { exact: true }).last().fill('abc-123');
    await dialog.getByLabel('VIN', { exact: true }).pressSequentially('wvwzzzauzjw99999912345');
    await dialog.getByLabel('Mileage (km)', { exact: true }).fill('99999999');
    await dialog.getByLabel('Engine power (kW)', { exact: true }).fill('60000');

    await expect(dialog.getByLabel('First name', { exact: true })).toHaveValue('Kata');
    await expect(dialog.getByLabel('Last name', { exact: true })).toHaveValue('Szabo-Nagy');
    await expect(dialog.getByLabel('Phone number', { exact: true })).toHaveValue('+3630-12');
    await expect(dialog.getByLabel('License plate', { exact: true }).last()).toHaveValue('ABC-123');
    await expect(dialog.getByLabel('VIN', { exact: true })).toHaveValue('WVWZZZAUZJW999999');
    await expect(dialog.getByLabel('Mileage (km)', { exact: true })).toHaveValue('1000000');
    await expect(dialog.getByLabel('Engine power (kW)', { exact: true })).toHaveValue('50000');
    await dialog.getByLabel('Mileage (km)', { exact: true }).fill('-5');
    await expect(dialog.getByLabel('Mileage (km)', { exact: true })).toHaveValue('0');
    await expect(dialog.getByTestId('scheduler-intake-task-description')).toHaveAttribute('maxlength', '200');
  });

  test('proposes the due moment, starts empty every time and keeps no earlier customer', async ({ page }) => {
    const { scheduler, dialog } = await openIntake(page);
    const expectedDue = toDatetimeLocalValue(new Date(proposedDue()));

    await expect(dialog.getByTestId('scheduler-intake-create')).toHaveCount(0);
    await expect(dialog.getByText('Initial status')).toBeVisible();
    await scheduler.searchByLicensePlate('NXE-441');
    await dialog.getByRole('button', { name: 'Select' }).first().click();
    await expect(dialog.getByTestId('scheduler-intake-due-datetime')).toHaveValue(expectedDue);

    await page.keyboard.press('Escape');
    await expect(scheduler.intakeDialog()).toHaveCount(0);
    const reopened = await scheduler.openIntakeForCurrentDay();

    await expect(reopened.getByTestId('scheduler-intake-license-plate-lookup')).toHaveValue('');
    await expect(reopened.getByTestId('scheduler-intake-name-lookup')).toHaveValue('');
    await expect(reopened.getByText('Existing customer selected')).toHaveCount(0);
  });
});
