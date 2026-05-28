import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CustomersPage } from './pages/customers.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks, type InstallApiMockOptions } from './support/api-mocks';
import { MOCK_CUSTOMER_IDS, MOCK_VEHICLE_IDS } from './support/test-data';

/** Optional mock failure setup for customer-registry E2E preparation. */
type CustomerRegistrySetupOptions = Pick<InstallApiMockOptions, 'failedVehicleHistoryIds'>;

/** Prepares authenticated customer-registry state with optional repair-history failures. */
async function prepareCustomerRegistry(page: Page, options: CustomerRegistrySetupOptions = {}): Promise<void> {
  const env = getAppointmentFlowEnv();

  await installApiMocks(page, {
    profileEmail: env.mechanicEmail,
    ...options,
  });
  await new AuthPage(page).loginAsMechanic(env);
}

test.describe('Customer registry vehicle flows', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCustomerRegistry(page);
  });

  test('filters customers by related vehicle license plate', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();

    await customersPage.searchByVehiclePlate('NXE-441');

    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna)).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.bela)).toHaveCount(0);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.nora)).toHaveCount(0);
  });

  test('shows empty state when search has no matching customers', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();

    await customersPage.searchByVehiclePlate('ZZZ-000');

    await expect(page.getByText(/No customers match your current filter|Nincs a szűrésnek megfelelő ügyfél/i)).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna)).toHaveCount(0);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.bela)).toHaveCount(0);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.nora)).toHaveCount(0);
  });

  test('opens vehicle history panel without vehicle specification fields', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    await customersPage.openFirstVehicleDetails(MOCK_CUSTOMER_IDS.anna);

    const panel = customersPage.detailsPanel();
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
    await expect(panel).toContainText('Hybrid system inspection');
    await expect(panel).not.toContainText(/HP|Torque/i);

    await customersPage.vehicleDetailsToggle(MOCK_CUSTOMER_IDS.anna).click();
    await customersPage.expectCustomerHistoryPanel();
  });

  test('shows empty state for vehicles without repair history', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    await customersPage.vehicleDetailsToggle(MOCK_CUSTOMER_IDS.anna).click();
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
    await customersPage.vehicleDetailsToggle(MOCK_CUSTOMER_IDS.anna).click();
    await customersPage.expectCustomerHistoryPanel();

    await customersPage.vehicleDetailsToggle(MOCK_CUSTOMER_IDS.anna, 1).click();

    const panel = customersPage.detailsPanel();
    await customersPage.expectVehicleHistoryOnlyPanel('PHE-220');
    await expect(panel).toContainText(/No repair history found for this vehicle|Nincs javítási előzmény ehhez a járműhöz/i);
  });

  test('vehicle form exposes VIN, kW power, and drivetrain without HP or torque', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    const dialog = await customersPage.openCreateVehicle(MOCK_CUSTOMER_IDS.anna);

    await expect(dialog.getByLabel('VIN')).toBeVisible();
    await expect(dialog.getByLabel('Engine power (kW)')).toBeVisible();
    await expect(dialog.getByLabel('Drivetrain')).toBeVisible();
    await expect(dialog).not.toContainText(/HP|Torque/i);

    await dialog.getByLabel('License plate').fill('EVT-260');
    await dialog.getByLabel('VIN').fill('WAUZZZF43MA123456');
    await dialog.getByLabel('Brand').fill('Audi');
    await dialog.getByLabel('Model').fill('Q4 e-tron');
    await dialog.getByLabel('Year').fill('2023');
    await dialog.getByLabel('Mileage (km)').fill('18000');
    await dialog.getByLabel('Engine power (kW)').fill('150');
    await dialog.getByLabel('Drivetrain').selectOption('Electric');

    await expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  test('creates a vehicle and refreshes the expanded customer vehicle list', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    const dialog = await customersPage.openCreateVehicle(MOCK_CUSTOMER_IDS.anna);

    await dialog.getByLabel('License plate').fill('EVT-260');
    await dialog.getByLabel('VIN').fill('WAUZZZF43MA123456');
    await dialog.getByLabel('Brand').fill('Audi');
    await dialog.getByLabel('Model').fill('Q4 e-tron');
    await dialog.getByLabel('Year').fill('2023');
    await dialog.getByLabel('Mileage (km)').fill('18000');
    await dialog.getByLabel('Engine power (kW)').fill('150');
    await dialog.getByLabel('Drivetrain').selectOption('Electric');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(customersPage.vehicleDialog('Create vehicle')).toHaveCount(0);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Vehicle created successfully.');
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna).getByText('EVT-260')).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna).getByText('Audi Q4 e-tron (2023)')).toBeVisible();
  });
});

test.describe('Customer registry vehicle history failures', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCustomerRegistry(page, {
      failedVehicleHistoryIds: [MOCK_VEHICLE_IDS.annaNxe441],
    });
  });

  test('keeps vehicle specifications hidden when history loading fails', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    await customersPage.openFirstVehicleDetails(MOCK_CUSTOMER_IDS.anna);

    const panel = customersPage.detailsPanel();
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
    await expect(panel).toContainText(/No repair history found for this vehicle|Nincs javítási előzmény ehhez a járműhöz/i);
    await expect(page.locator('output[aria-live="polite"]')).toContainText(/Failed to load repair history|Nem sikerült betölteni a javítási előzményeket/i);
  });
});