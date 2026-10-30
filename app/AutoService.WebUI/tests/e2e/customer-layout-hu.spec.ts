/** Customers at 320px (cards, tiles and both form dialogs stay inside the viewport) and in Hungarian
 * (page, form, delete and server-error wording). */
import { expect, test, type Locator } from '@playwright/test';
import { CustomersPage } from './pages/customers.page';
import { selectDropdownOptionByLabel } from './support/dropdown';
import { MOCK_CUSTOMER_IDS } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';
import { expectInsideViewport as expectInsideViewportOf } from './support/viewport-bounds';

const ANNA = MOCK_CUSTOMER_IDS.anna;
const PHONE_WIDTH = 320;

const expectInsideViewport = (target: Locator): Promise<void> => expectInsideViewportOf(target, PHONE_WIDTH);

test.describe('Customers at 320px', () => {
  test.use({ viewport: { width: PHONE_WIDTH, height: 900 } });

  test('the page, an expanded card and its vehicle tiles stay inside the viewport', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page, { isAdmin: true });
    await customersPage.expandCustomer(ANNA);

    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(hasNoHorizontalOverflow).toBe(true);
    await expectInsideViewport(customersPage.customerCard(ANNA));
    await expectInsideViewport(customersPage.vehicleTile(ANNA, 0));
    await expectInsideViewport(customersPage.customerCard(ANNA).getByRole('button', { name: 'Delete customer' }));
    await expectInsideViewport(customersPage.vehicleTile(ANNA, 0).getByRole('button', { name: 'Delete vehicle' }));
  });

  test('the customer and vehicle dialogs fit and keep Save reachable', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    await customersPage.expandCustomer(ANNA);

    const customerDialog = await customersPage.openCreateCustomer();
    await expectInsideViewport(customerDialog);
    await customerDialog.getByRole('button', { name: 'Save' }).scrollIntoViewIfNeeded();
    await expectInsideViewport(customerDialog.getByRole('button', { name: 'Save' }));
    await customerDialog.getByRole('button', { name: 'Cancel' }).click();

    const vehicleDialog = await customersPage.openCreateVehicle(ANNA);
    await expectInsideViewport(vehicleDialog);
    await vehicleDialog.getByRole('button', { name: 'Save' }).scrollIntoViewIfNeeded();
    await expectInsideViewport(vehicleDialog.getByRole('button', { name: 'Save' }));
  });
});

test.describe('Customers in Hungarian', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('names the page, the search and the empty states in Hungarian', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page, {}, 'hu');

    await expect(customersPage.searchInput()).toHaveAttribute('placeholder', 'Név vagy rendszám...');
    await expect(customersPage.createCustomerButton()).toHaveText('Ügyfél létrehozása');
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.nora);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.nora)).toContainText('Ehhez az ügyfélhez nincs jármű.');
    await expect(customersPage.detailsPanel()).toContainText('Nincs javítási előzmény ehhez az ügyfélhez.');

    await customersPage.searchInput().fill('zzz');
    await expect(page.getByText('Nincs a szűrésnek megfelelő ügyfél.')).toBeVisible();
  });

  test('labels the customer form and shows a taken e-mail in Hungarian', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page, {}, 'hu');
    await customersPage.createCustomerButton().click();
    const dialog = page.getByRole('dialog', { name: 'Ügyfél létrehozása' });

    await dialog.getByLabel('Keresztnév').fill('Zoe');
    await dialog.getByLabel('Vezetéknév').fill('Aaron');
    await dialog.getByLabel('E-mail').fill('anna.kovacs@example.test');
    await expect(dialog.getByLabel('Telefonszám')).toBeVisible();
    await dialog.getByRole('button', { name: 'Mentés' }).click();

    await expect(dialog.getByText('Már létezik személy ezzel az e-mail-címmel.')).toBeVisible();
    await expect(errorToastMessage(page, 'Már létezik személy ezzel az e-mail-címmel.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Mégse' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('words the customer deletion in Hungarian', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page, { isAdmin: true }, 'hu');
    await customersPage.customerCard(MOCK_CUSTOMER_IDS.nora).getByRole('button', { name: 'Ügyfél törlése' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ügyfél törlésének megerősítése' });

    await expect(dialog).toContainText('Farkas Nora törlése? A kapcsolódó járművek és időpontok is törlődnek.');
    await dialog.getByRole('button', { name: 'Ügyfél törlése' }).click();

    await expect(toastMessage(page, 'Ügyfél sikeresen törölve.')).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.nora)).toHaveCount(0);
  });

  test('labels the vehicle form and shows a taken plate in Hungarian', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page, {}, 'hu');
    await customersPage.expandCustomer(ANNA);
    await customersPage.customerCard(ANNA).getByRole('button', { name: 'Jármű létrehozása' }).click();
    const dialog = page.getByRole('dialog', { name: 'Jármű létrehozása' });

    await dialog.getByLabel('Rendszám').fill('NXE-441');
    await dialog.getByLabel('VIN').fill('WAUZZZF43MA123456');
    await dialog.getByLabel('Márka').fill('Audi');
    await dialog.getByLabel('Modell').fill('Q4 e-tron');
    await dialog.getByLabel('Évjárat').fill('2023');
    await dialog.getByLabel('Futásteljesítmény (km)').fill('18000');
    await dialog.getByLabel('Motorteljesítmény (kW)').fill('150');
    await selectDropdownOptionByLabel(page, dialog.getByLabel('Hajtáslánc'), 'Elektromos');
    await dialog.getByRole('button', { name: 'Mentés' }).click();

    await expect(dialog.getByText('Ez a rendszám már szerepel a rendszerben.')).toBeVisible();
    await expect(dialog.getByLabel('Rendszám')).toHaveAttribute('aria-invalid', 'true');
  });
});
