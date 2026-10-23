/** The whole vehicle tile selects the vehicle and shows its history beside the list; the row actions on the
 * tile keep their own behaviour and never select it. */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { ANNA_VEHICLE_ROW, CustomersPage } from './pages/customers.page';
import { installApiMocks } from './support/api-mocks';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { MOCK_CUSTOMER_IDS } from './support/test-data';

const showHistoryLabel = /^(Show vehicle history|Járműelőzmények megjelenítése)$/i;
const hideHistoryLabel = /^(Hide vehicle history|Járműelőzmények elrejtése)$/i;

/** Signs in as a mechanic and expands Anna's card, which shows her two vehicles. */
async function openAnna(page: Page): Promise<CustomersPage> {
  const env = getAppointmentFlowEnv();
  await installApiMocks(page, { profileEmail: env.mechanicEmail });
  await new AuthPage(page).loginAsMechanic(env);

  const customersPage = new CustomersPage(page);
  await customersPage.goto();
  await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

  return customersPage;
}

test.describe('Customer vehicle tile selection', () => {
  // Tall enough that the page-size-by-height list shows all three fixture customers on page 1.
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('a click on the tile body selects the vehicle and a second click deselects it', async ({ page }) => {
    const customersPage = await openAnna(page);
    const tile = customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);
    const box = await tile.boundingBox();
    if (box === null) {
      throw new Error('The vehicle tile has no layout box.');
    }

    await expect(tile.getByRole('button', { name: showHistoryLabel })).toHaveCount(1);
    await tile.click({ position: { x: 12, y: box.height - 8 } });
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
    await expect(tile.getByRole('button', { name: hideHistoryLabel })).toHaveCount(1);

    await tile.click({ position: { x: box.width / 2, y: 12 } });
    await customersPage.expectCustomerHistoryPanel();
  });

  test('a click on another tile moves the selection to that vehicle', async ({ page }) => {
    const customersPage = await openAnna(page);

    await customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441).click();
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');

    await customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.phe220).click();
    await customersPage.expectVehicleHistoryOnlyPanel('PHE-220');
  });

  test('the tile selects from the keyboard with Enter and deselects with Space', async ({ page }) => {
    const customersPage = await openAnna(page);
    const tile = customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);
    const selectButton = tile.getByTestId('vehicle-select-button');

    await selectButton.focus();
    await page.keyboard.press('Enter');
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
    await expect(selectButton).toBeFocused();

    await page.keyboard.press('Space');
    await customersPage.expectCustomerHistoryPanel();
  });

  test('the edit action on the tile opens its dialog without selecting the vehicle', async ({ page }) => {
    const customersPage = await openAnna(page);
    const tile = customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);

    await tile.getByRole('button', { name: 'Edit vehicle' }).click();
    const dialog = customersPage.vehicleDialog('Edit vehicle');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await customersPage.expectCustomerHistoryPanel();
    await expect(tile.getByRole('button', { name: showHistoryLabel })).toHaveCount(1);
  });

  test('the tile no longer carries a separate history icon button', async ({ page }) => {
    const customersPage = await openAnna(page);
    const tile = customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);

    await expect(tile.getByRole('button')).toHaveCount(3);
    await expect(tile.getByRole('button', { name: /vehicle history/i })).toHaveAttribute('data-testid', 'vehicle-select-button');
  });
});

test.describe('Customer vehicle tile selection at 320px', () => {
  test.use({ viewport: { width: 320, height: 900 } });

  test('a tap on the tile shows the vehicle history', async ({ page }) => {
    const customersPage = await openAnna(page);
    const tile = customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);

    await tile.click();
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
  });
});
