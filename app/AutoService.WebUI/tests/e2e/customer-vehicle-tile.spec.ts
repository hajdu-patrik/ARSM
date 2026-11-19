/** The whole vehicle tile selects the vehicle and shows its history beside the list; the row actions on the
 * tile keep their own behaviour and never select it. */
import { expect, test, type Page } from '@playwright/test';
import { ANNA_VEHICLE_ROW, CustomersPage } from './pages/customers.page';
import { MOCK_CUSTOMER_IDS } from './support/test-data';

/** The tile's select button is named by its plate; aria-expanded carries the shown state, the title the action. */
const historyButtonName = /^[A-Z0-9-]+ (vehicle repair history|jármű javítási előzményei)$/i;

/** Click offset from the tile edge, clear of the row actions on the right. */
const tileEdgeInsetPx = 10;

/** Signs in as a mechanic and expands Anna's card, which shows her two vehicles. */
async function openAnna(page: Page): Promise<CustomersPage> {
  const { customersPage } = await CustomersPage.open(page);
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

    const selectButton = tile.getByRole('button', { name: historyButtonName });
    await expect(selectButton).toHaveAttribute('aria-expanded', 'false');
    await expect(selectButton).toHaveAttribute('title', 'Show vehicle history');
    await tile.click({ position: { x: tileEdgeInsetPx, y: box.height - tileEdgeInsetPx } });
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
    await expect(selectButton).toHaveAttribute('aria-expanded', 'true');
    await expect(selectButton).toHaveAttribute('title', 'Hide vehicle history');

    await tile.click({ position: { x: box.width / 2, y: tileEdgeInsetPx } });
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
    await expect(tile.getByRole('button', { name: historyButtonName })).toHaveAttribute('aria-expanded', 'false');
  });

  test('the tile no longer carries a separate history icon button', async ({ page }) => {
    const customersPage = await openAnna(page);
    const tile = customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);

    await expect(tile.getByRole('button')).toHaveCount(3);
    await expect(tile.getByRole('button', { name: historyButtonName })).toHaveAttribute('data-testid', 'vehicle-select-button');
    await expect(tile.getByRole('button', { name: 'NXE-441 vehicle repair history' })).toHaveCount(1);
  });
});

test.describe('Customer vehicle tile selection at 320px', () => {
  test.use({ viewport: { width: 320, height: 900 } });
  const touchTargetPx = 44;

  test('a tap on the tile shows the vehicle history', async ({ page }) => {
    const customersPage = await openAnna(page);
    const tile = customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);

    await tile.click();
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
  });

  test('the tile fits the viewport and its row actions keep 44px targets without colliding', async ({ page }) => {
    const customersPage = await openAnna(page);
    const tile = customersPage.vehicleTile(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);
    const tileBox = await tile.boundingBox();
    if (tileBox === null) {
      throw new Error('The vehicle tile has no layout box.');
    }

    expect(tileBox.x).toBeGreaterThanOrEqual(0);
    expect(tileBox.x + tileBox.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const actionBoxes = [];
    const actions = [tile.getByTestId('vehicle-create-quote-button'), tile.getByRole('button', { name: 'Edit vehicle' })];
    for (const button of actions) {
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      if (box === null) {
        throw new Error('A row action has no layout box.');
      }
      expect(box.width).toBeGreaterThanOrEqual(touchTargetPx);
      expect(box.height).toBeGreaterThanOrEqual(touchTargetPx);
      expect(box.x).toBeGreaterThanOrEqual(tileBox.x);
      expect(box.x + box.width).toBeLessThanOrEqual(tileBox.x + tileBox.width);
      actionBoxes.push(box);
    }

    const [first, second] = actionBoxes;
    if (first === undefined || second === undefined) {
      throw new Error('Both row actions need a layout box.');
    }
    const apart = first.x + first.width <= second.x || second.x + second.width <= first.x
      || first.y + first.height <= second.y || second.y + second.height <= first.y;
    expect(apart).toBe(true);
  });
});
