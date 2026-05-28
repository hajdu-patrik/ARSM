import { expect, test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { SchedulerPage } from './pages/scheduler.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';

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
    await dialog.getByRole('button', { name: 'Select' }).first().click();

    await expect(dialog.getByText('Existing customer selected')).toBeVisible();
    await expect(dialog.getByText('anna.kovacs@example.test')).toBeVisible();
    await expect(dialog.getByTestId('scheduler-intake-existing-vehicle')).toHaveValue('1001');
    await expect(dialog.getByTestId('scheduler-intake-existing-vehicle')).toContainText('NXE-441 - Volkswagen Golf (2018)');
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
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Intake created successfully.');
    await expect(page.getByText(taskDescription)).toBeVisible();
    await expect(page.getByText('NXE-441').first()).toBeVisible();
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
    await expect(dialog.getByTestId('scheduler-intake-existing-vehicle')).toHaveValue('1004');
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

    await expect(dialog.getByText(/Ügyfél nem található|Nincs találat erre a névre/)).toBeVisible();
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