/** Create-vehicle modal: the eight required fields, the VIN input rules, the request payload and the
 * server refusals, each pinned to its field or toasted. */
import { expect, test, type Page } from '@playwright/test';
import { CustomersPage, ELECTRIC_AUDI } from './pages/customers.page';
import { selectDropdownOptionByLabel } from './support/dropdown';
import { MOCK_CUSTOMER_IDS } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

test.use({ viewport: { width: 1280, height: 1000 } });

const ANNA = MOCK_CUSTOMER_IDS.anna;
const PLATE_TAKEN = 'A vehicle with this license plate already exists.';

async function openCreateDialog(page: Page) {
  const { customersPage, state } = await CustomersPage.open(page);
  await customersPage.expandCustomer(ANNA);

  return { customersPage, state, dialog: await customersPage.openCreateVehicle(ANNA) };
}

test.describe('Create vehicle', () => {
  test('keeps Save disabled until all eight fields are filled', async ({ page }) => {
    const { dialog } = await openCreateDialog(page);
    const save = dialog.getByRole('button', { name: 'Save' });

    await expect(save).toBeDisabled();
    await dialog.getByLabel('License plate').fill(ELECTRIC_AUDI.licensePlate);
    await dialog.getByLabel('VIN').fill(ELECTRIC_AUDI.vin);
    await dialog.getByLabel('Brand').fill(ELECTRIC_AUDI.brand);
    await dialog.getByLabel('Model').fill(ELECTRIC_AUDI.model);
    await dialog.getByLabel('Year').fill(ELECTRIC_AUDI.year);
    await dialog.getByLabel('Mileage (km)').fill(ELECTRIC_AUDI.mileageKm);
    await dialog.getByLabel('Engine power (kW)').fill(ELECTRIC_AUDI.enginePowerKw);
    await expect(save).toBeDisabled();

    await selectDropdownOptionByLabel(page, dialog.getByLabel('Drivetrain'), 'Electric');
    await expect(save).toBeEnabled();
    await dialog.getByLabel('Model').fill('');
    await expect(save).toBeDisabled();
  });

  test('upper-cases the VIN as it is typed and stops at 17 characters', async ({ page }) => {
    const { dialog } = await openCreateDialog(page);

    await dialog.getByLabel('VIN').pressSequentially('wauzzzf43ma123456xx');

    await expect(dialog.getByLabel('VIN')).toHaveValue('WAUZZZF43MA123456');
  });

  test('sends trimmed texts and numeric values, then lists the new vehicle', async ({ page }) => {
    const { customersPage, dialog } = await openCreateDialog(page);
    await customersPage.fillVehicle(dialog, { ...ELECTRIC_AUDI, brand: '  Audi ', model: ' Q4 e-tron  ' });

    const request = page.waitForRequest((candidate) => candidate.method() === 'POST' && new URL(candidate.url()).pathname === `/api/customers/${String(ANNA)}/vehicles`);
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await request).postDataJSON()).toEqual({
      licensePlate: 'EVT-260',
      vin: 'WAUZZZF43MA123456',
      brand: 'Audi',
      model: 'Q4 e-tron',
      year: 2023,
      mileageKm: 18000,
      enginePowerKw: 150,
      drivetrainType: 'Electric',
    });
    await expect(toastMessage(page, 'Vehicle created successfully.')).toBeVisible();
    await expect(customersPage.customerCard(ANNA)).toContainText('Vehicles: 3');
  });

  test('refuses a taken license plate under the plate field, and the error clears on edit', async ({ page }) => {
    const { customersPage, dialog } = await openCreateDialog(page);
    await customersPage.fillVehicle(dialog, { ...ELECTRIC_AUDI, licensePlate: 'nxe-441' });
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, PLATE_TAKEN)).toBeVisible();
    await expect(dialog.getByLabel('License plate')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByText(PLATE_TAKEN)).toBeVisible();
    await expect(dialog.getByLabel('VIN')).not.toHaveAttribute('aria-invalid', 'true');

    await dialog.getByLabel('License plate').fill('EVT-261');
    await expect(dialog.getByLabel('License plate')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByText(PLATE_TAKEN)).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(toastMessage(page, 'Vehicle created successfully.')).toBeVisible();
    await expect(customersPage.vehicleDialog('Create vehicle')).toHaveCount(0);
  });

  test('marks the VIN field when the VIN already belongs to another vehicle', async ({ page }) => {
    const { customersPage, dialog } = await openCreateDialog(page);
    await customersPage.fillVehicle(dialog, { ...ELECTRIC_AUDI, vin: 'WVWZZZAUZJW123456' });
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog.getByLabel('VIN')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByLabel('License plate')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(dialog).toBeVisible();
  });

  test('shows the VIN message under the field for a VIN shorter than 17 characters', async ({ page }) => {
    const { customersPage, dialog } = await openCreateDialog(page);
    await customersPage.fillVehicle(dialog, { ...ELECTRIC_AUDI, vin: 'WAUZZZF43MA12345' });
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog.getByText('VIN must be a valid 17-character identifier.')).toBeVisible();
    await expect(dialog.getByLabel('VIN')).toHaveAttribute('aria-invalid', 'true');
    await expect(errorToastMessage(page, 'VIN must be a valid 17-character identifier.')).toBeVisible();
  });

  test('toasts an out-of-range year and a negative mileage and keeps the dialog', async ({ page }) => {
    const { customersPage, dialog } = await openCreateDialog(page);
    await customersPage.fillVehicle(dialog, { ...ELECTRIC_AUDI, year: '1800' });
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(errorToastMessage(page, 'Vehicle year must be between 1886 and 2100.')).toBeVisible();

    await dialog.getByLabel('Year').fill('2023');
    await dialog.getByLabel('Mileage (km)').fill('-5');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(errorToastMessage(page, 'Vehicle numeric values must be valid non-negative numbers.')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('toasts that the owner is gone when the customer was deleted meanwhile', async ({ page }) => {
    const { customersPage, state, dialog } = await openCreateDialog(page);
    await customersPage.fillVehicle(dialog, ELECTRIC_AUDI);
    state.customers.splice(state.customers.findIndex((customer) => customer.id === ANNA), 1);

    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'Customer not found.')).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});
