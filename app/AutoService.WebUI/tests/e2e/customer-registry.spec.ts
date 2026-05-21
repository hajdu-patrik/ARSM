import { expect, test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CustomersPage } from './pages/customers.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import { MOCK_CUSTOMER_IDS } from './support/test-data';

test.describe('Customer registry vehicle flows', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail });
    await new AuthPage(page).loginAsMechanic(env);
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

  test('opens vehicle details panel with VIN, kW power, and drivetrain', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    await customersPage.openFirstVehicleDetails(MOCK_CUSTOMER_IDS.anna);

    const panel = customersPage.detailsPanel();
    await expect(panel.getByRole('heading', { name: 'NXE-441' })).toBeVisible();
    await expect(panel).toContainText('VIN');
    await expect(panel).toContainText('WVWZZZAUZJW123456');
    await expect(panel).toContainText('Engine power (kW)');
    await expect(panel).toContainText('110 kW');
    await expect(panel).toContainText('Drivetrain');
    await expect(panel).toContainText('Hybrid');
    await expect(panel).not.toContainText(/HP|Torque/i);

    await customersPage.vehicleDetailsToggle(MOCK_CUSTOMER_IDS.anna).click();
    await expect(panel.getByRole('heading', { name: 'Kovacs Anna' })).toBeVisible();
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
});