/** Scheduler intake validation: the required fields in the order the form checks them, and the wording
 * of every refusal the API can answer a create with. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { refuseApiRoute } from './support/appointment-route-overrides';
import { dismissToasts } from './support/appointment-ui';
import { toDatetimeLocalValue } from './support/appointment-fixtures';
import { signInWithMocks } from './support/sign-in';
import type { TestLanguage } from './support/browser-state';
import { errorToastMessage, toastRegion } from './support/toast';

const NO_MATCH_NAME = 'Nobody Atall';

const VALID_VEHICLE = {
  licensePlate: 'ABC-123',
  vin: 'WVWZZZAUZJW999999',
  brand: 'Skoda',
  model: 'Fabia',
  year: '2020',
  mileageKm: '15000',
  enginePowerKw: '90',
  drivetrain: 'Diesel',
} as const;

/** Server refusals of the create (all 400) and the toast each one is worded as; the lower-cased detail picks the first matching term. */
const SERVER_REFUSALS: ReadonlyArray<readonly [string, string]> = [
  ['Invalid email address.', 'Email must be a valid email address.'],
  ['TaskDescription is required.', 'Task description is required.'],
  ['DueDateTime must be greater than or equal to ScheduledDate.', 'Due date and time must be after the scheduled date and time.'],
  ['CustomerFirstName and CustomerLastName are required.', 'First and last name are required for new customer.'],
  ['Phone number must be a valid European number.', 'Phone number must be a valid European number.'],
  ['Vehicle with this license plate already exists.', 'A vehicle with this license plate is already registered.'],
  ['Invalid VIN.', 'VIN must be a valid 17-character identifier.'],
  ['Invalid drivetrain type.', 'Select a valid drivetrain type.'],
  ['Invalid license plate.', 'License plate format is invalid.'],
  ['Vehicle.Year must be between 1886 and 2100.', 'Vehicle year must be between 1886 and 2100.'],
  ['Vehicle.MileageKm must be non-negative.', 'Vehicle numeric values must be non-negative.'],
  ['ScheduledDate cannot be in the past.', 'Scheduled date cannot be earlier than today.'],
  ['Customer already exists.', 'Customer or vehicle data conflicts with existing records.'],
  ['Invalid first name.', 'Name may only contain letters and hyphens.'],
  ['Vehicle.Brand is required.', 'Vehicle plate, VIN, brand, model, and drivetrain are required.'],
  ['Something unexpected.', 'Failed to create intake.'],
];

/** Opens the intake for today and searches a name that no customer has, so the new customer form shows. */
async function openNewCustomerForm(page: Page, language: TestLanguage = 'en'): Promise<{ scheduler: SchedulerPage; dialog: Locator }> {
  await signInWithMocks(page, {}, language);
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();
  const dialog = await scheduler.openIntakeForCurrentDay();
  await scheduler.searchByName(NO_MATCH_NAME);
  await expect(dialog.getByTestId('scheduler-intake-customer-email')).toBeVisible();

  return { scheduler, dialog };
}

test.describe('Scheduler intake - required fields', () => {
  test('checks the email, the due time, the task, the vehicle and the new customer name, in that order', async ({ page }) => {
    const { scheduler, dialog } = await openNewCustomerForm(page);
    const due = dialog.getByTestId('scheduler-intake-due-datetime');
    const defaultDue = await due.inputValue();
    const today = new Date();
    const yesterdayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12);

    await scheduler.createWithCurrentForm();
    await expect(errorToastMessage(page, 'Customer email is required.')).toBeVisible();

    await dialog.getByTestId('scheduler-intake-customer-email').fill('kata.szabo@example.test');
    await due.fill('');
    await scheduler.createWithCurrentForm();
    await expect(errorToastMessage(page, 'Due date and time are required.')).toBeVisible();

    await due.fill(toDatetimeLocalValue(yesterdayNoon));
    await scheduler.createWithCurrentForm();
    await expect(errorToastMessage(page, 'Due date and time must be after the scheduled date and time.')).toBeVisible();

    await due.fill(defaultDue);
    await scheduler.createWithCurrentForm();
    await expect(errorToastMessage(page, 'Task description is required.')).toBeVisible();

    await dialog.getByTestId('scheduler-intake-task-description').fill('Timing belt replacement');
    await scheduler.createWithCurrentForm();
    await expect(errorToastMessage(page, 'Vehicle plate, VIN, brand, model, and drivetrain are required.')).toBeVisible();

    await dismissToasts(page);
    await scheduler.fillNewVehicle(VALID_VEHICLE);
    await dialog.getByLabel('First name', { exact: true }).fill('Kata');
    await scheduler.createWithCurrentForm();
    await expect(errorToastMessage(page, 'First and last name are required for new customer.')).toBeVisible();
  });

  test('toasts a refusal again when the same problem is submitted a second time', async ({ page }) => {
    const { scheduler } = await openNewCustomerForm(page);
    const emailRequired = errorToastMessage(page, 'Customer email is required.');

    await scheduler.createWithCurrentForm();
    await expect(emailRequired).toBeVisible();
    await dismissToasts(page);
    await expect(toastRegion(page).getByRole('alert')).toHaveCount(0);

    await scheduler.createWithCurrentForm();

    await expect(emailRequired).toBeVisible();
  });

  test('words the first refusal in Hungarian', async ({ page }) => {
    const { scheduler } = await openNewCustomerForm(page, 'hu');

    await scheduler.createWithCurrentForm();

    await expect(errorToastMessage(page, 'Az ügyfél e-mail-címe kötelező.')).toBeVisible();
  });
});

test.describe('Scheduler intake - refusals of the API', () => {
  test('words every known refusal of the create, and any other one as a plain failure', async ({ page }) => {
    const { scheduler, dialog } = await openNewCustomerForm(page);
    await dialog.getByTestId('scheduler-intake-customer-email').fill('kata.szabo@example.test');
    await dialog.getByLabel('First name', { exact: true }).fill('Kata');
    await dialog.getByLabel('Last name', { exact: true }).fill('Szabo');
    await scheduler.fillNewVehicle(VALID_VEHICLE);
    await dialog.getByTestId('scheduler-intake-task-description').fill('Timing belt replacement');
    const refusal = await refuseApiRoute(page, '/api/appointments/intake', 'POST', 400, { detail: '' });

    for (const [detail, message] of SERVER_REFUSALS) {
      refusal.respondWith(400, { detail });
      await dismissToasts(page);
      await scheduler.createWithCurrentForm();

      await expect(errorToastMessage(page, message)).toBeVisible();
      await expect(scheduler.intakeDialog()).toBeVisible();
    }
  });
});
