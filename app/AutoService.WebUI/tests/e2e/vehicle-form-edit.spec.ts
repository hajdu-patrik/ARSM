/** Edit-vehicle modal: prefilled values, what counts as a change, the PUT payload, a taken plate, a stale
 * vehicle and the keyboard close with focus returning to the edit button. */
import { expect, test, type Page } from '@playwright/test';
import { ANNA_VEHICLE_ROW, CustomersPage } from './pages/customers.page';
import { expectDropdownLabel, selectDropdownOptionByLabel } from './support/dropdown';
import { MOCK_CUSTOMER_IDS, MOCK_VEHICLE_IDS } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

test.use({ viewport: { width: 1280, height: 1000 } });

const ANNA = MOCK_CUSTOMER_IDS.anna;
const GOLF = ANNA_VEHICLE_ROW.nxe441;

async function openEditGolf(page: Page) {
  const { customersPage, state } = await CustomersPage.open(page);
  await customersPage.expandCustomer(ANNA);

  return { customersPage, state, dialog: await customersPage.openEditVehicle(ANNA, GOLF) };
}

test.describe('Edit vehicle', () => {
  test('is prefilled and counts a plate typed in other letter case as no change', async ({ page }) => {
    const { dialog } = await openEditGolf(page);
    const save = dialog.getByRole('button', { name: 'Save' });

    await expect(dialog.getByLabel('License plate')).toHaveValue('NXE-441');
    await expect(dialog.getByLabel('VIN')).toHaveValue('WVWZZZAUZJW123456');
    await expect(dialog.getByLabel('Brand')).toHaveValue('Volkswagen');
    await expect(dialog.getByLabel('Model')).toHaveValue('Golf');
    await expect(dialog.getByLabel('Year')).toHaveValue('2018');
    await expect(dialog.getByLabel('Mileage (km)')).toHaveValue('124500');
    await expect(dialog.getByLabel('Engine power (kW)')).toHaveValue('110');
    await expectDropdownLabel(dialog.getByLabel('Drivetrain'), 'Hybrid');
    await expect(save).toBeDisabled();

    await dialog.getByLabel('License plate').fill('nxe-441');
    await expect(save).toBeDisabled();
    await dialog.getByLabel('Mileage (km)').fill('125000');
    await expect(save).toBeEnabled();
    await dialog.getByLabel('Mileage (km)').fill('124500');
    await expect(save).toBeDisabled();
  });

  test('sends the whole vehicle and shows the change on the tile', async ({ page }) => {
    const { customersPage, dialog } = await openEditGolf(page);
    await dialog.getByLabel('Model').fill('Golf GTI');
    await dialog.getByLabel('Year').fill('2019');
    await selectDropdownOptionByLabel(page, dialog.getByLabel('Drivetrain'), 'Electric');

    const request = page.waitForRequest((candidate) => candidate.method() === 'PUT' && new URL(candidate.url()).pathname === `/api/vehicles/${String(MOCK_VEHICLE_IDS.annaNxe441)}`);
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await request).postDataJSON()).toEqual({
      licensePlate: 'NXE-441',
      vin: 'WVWZZZAUZJW123456',
      brand: 'Volkswagen',
      model: 'Golf GTI',
      year: 2019,
      mileageKm: 124500,
      enginePowerKw: 110,
      drivetrainType: 'Electric',
    });
    await expect(toastMessage(page, 'Vehicle updated successfully.')).toBeVisible();
    await expect(customersPage.vehicleDialog('Edit vehicle')).toHaveCount(0);
    const tile = customersPage.vehicleTile(ANNA, GOLF);
    await expect(tile).toContainText('Volkswagen Golf GTI (2019)');
    await expect(tile).toContainText('Drivetrain: Electric');
  });

  test('refuses the plate of another vehicle under the plate field', async ({ page }) => {
    const { dialog } = await openEditGolf(page);
    await dialog.getByLabel('License plate').fill('PHE-220');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'A vehicle with this license plate already exists.')).toBeVisible();
    await expect(dialog.getByLabel('License plate')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByText('A vehicle with this license plate already exists.')).toBeVisible();
  });

  test('toasts that the vehicle is gone when it was deleted meanwhile', async ({ page }) => {
    const { dialog, state } = await openEditGolf(page);
    state.vehiclesByCustomerId[ANNA] = (state.vehiclesByCustomerId[ANNA] ?? []).filter((vehicle) => vehicle.id !== MOCK_VEHICLE_IDS.annaNxe441);

    await dialog.getByLabel('Mileage (km)').fill('125000');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'Vehicle not found.')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('Escape closes the dialog without a write and focus returns to the edit button', async ({ page }) => {
    const { customersPage, dialog } = await openEditGolf(page);
    const writes: string[] = [];
    page.on('request', (request) => {
      if (!['GET', 'OPTIONS'].includes(request.method())) {
        writes.push(request.method());
      }
    });

    await dialog.getByLabel('Mileage (km)').fill('125000');
    await page.keyboard.press('Escape');

    await expect(dialog).toHaveCount(0);
    await expect(customersPage.vehicleTile(ANNA, GOLF).getByRole('button', { name: 'Edit vehicle' })).toBeFocused();
    await customersPage.expectCustomerHistoryPanel();
    expect(writes).toEqual([]);
  });
});
