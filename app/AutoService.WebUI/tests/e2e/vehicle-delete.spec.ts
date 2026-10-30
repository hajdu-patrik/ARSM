/** Admin vehicle deletion: the confirmation names the plate, the tile list and the vehicle count follow, a
 * deleted selected vehicle returns the panel to the customer, and a stale delete fails visibly. */
import { expect, test, type Page } from '@playwright/test';
import { ANNA_VEHICLE_ROW, CustomersPage } from './pages/customers.page';
import { MOCK_CUSTOMER_IDS, MOCK_VEHICLE_IDS, type MockApiState } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

test.use({ viewport: { width: 1280, height: 1000 } });

async function openAnna(page: Page): Promise<{ customersPage: CustomersPage; state: MockApiState }> {
  const opened = await CustomersPage.open(page, { isAdmin: true });
  await opened.customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

  return opened;
}

test.describe('Delete vehicle', () => {
  test('names the plate, keeps the vehicle on Cancel and removes it on confirm', async ({ page }) => {
    const { customersPage } = await openAnna(page);
    const card = customersPage.customerCard(MOCK_CUSTOMER_IDS.anna);
    const dialog = await customersPage.openDeleteVehicle(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);

    await expect(dialog).toContainText('Delete vehicle NXE-441? Related appointments will also be removed.');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(card.getByTestId('vehicle-tile')).toHaveCount(2);

    const confirmDialog = await customersPage.openDeleteVehicle(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);
    const request = page.waitForRequest((candidate) => candidate.method() === 'DELETE' && new URL(candidate.url()).pathname === `/api/vehicles/${String(MOCK_VEHICLE_IDS.annaNxe441)}`);
    await confirmDialog.getByRole('button', { name: 'Delete vehicle' }).click();
    await request;

    await expect(toastMessage(page, 'Vehicle deleted successfully.')).toBeVisible();
    await expect(card.getByTestId('vehicle-tile')).toHaveCount(1);
    await expect(card.getByText('NXE-441', { exact: true })).toHaveCount(0);
    await expect(card.getByText('PHE-220', { exact: true })).toBeVisible();
    await expect(card).toContainText('Vehicles: 1');
  });

  test('returns the details panel to the customer when the selected vehicle is deleted', async ({ page }) => {
    const { customersPage } = await openAnna(page);
    await customersPage.openVehicleDetails(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');

    const dialog = await customersPage.openDeleteVehicle(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);
    await dialog.getByRole('button', { name: 'Delete vehicle' }).click();

    await expect(toastMessage(page, 'Vehicle deleted successfully.')).toBeVisible();
    await customersPage.expectCustomerHistoryPanel();
  });

  test('keeps the dialog open and toasts a failure when the vehicle is already gone', async ({ page }) => {
    const { customersPage, state } = await openAnna(page);
    const dialog = await customersPage.openDeleteVehicle(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.phe220);
    state.vehiclesByCustomerId[MOCK_CUSTOMER_IDS.anna] = (state.vehiclesByCustomerId[MOCK_CUSTOMER_IDS.anna] ?? [])
      .filter((vehicle) => vehicle.id !== MOCK_VEHICLE_IDS.annaPhe220);

    await dialog.getByRole('button', { name: 'Delete vehicle' }).click();

    await expect(errorToastMessage(page, 'Failed to delete vehicle.')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('steps the vehicle pager back when the deleted vehicle was alone on the last page', async ({ page }) => {
    const { customersPage, state } = await CustomersPage.open(page, { isAdmin: true });
    const vehicles = state.vehiclesByCustomerId[MOCK_CUSTOMER_IDS.anna] ?? [];
    const template = vehicles[0];
    if (template === undefined) {
      throw new Error('The mock state has no vehicles for Anna.');
    }

    // Four Audis sort before Hyundai and Volkswagen: pages of 5 and 1, the Golf alone on page 2.
    for (let index = 1; index <= 4; index += 1) {
      vehicles.push({ ...template, id: 2100 + index, licensePlate: `AUD-00${String(index)}`, brand: 'Audi', model: `Model${String(index)}` });
    }
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);
    const { next, indicator } = customersPage.vehiclePagination(MOCK_CUSTOMER_IDS.anna);
    const card = customersPage.customerCard(MOCK_CUSTOMER_IDS.anna);

    await expect(indicator).toHaveText('1 / 2');
    await next.click();
    await expect(indicator).toHaveText('2 / 2');
    await expect(card.getByTestId('vehicle-tile')).toHaveCount(1);

    const dialog = await customersPage.openDeleteVehicle(MOCK_CUSTOMER_IDS.anna, 0);
    await expect(dialog).toContainText('NXE-441');
    await dialog.getByRole('button', { name: 'Delete vehicle' }).click();

    await expect(toastMessage(page, 'Vehicle deleted successfully.')).toBeVisible();
    await expect(indicator).toHaveText('1 / 1');
    await expect(card.getByTestId('vehicle-tile')).toHaveCount(5);
  });
});
