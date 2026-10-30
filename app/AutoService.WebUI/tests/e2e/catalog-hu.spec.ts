/** The Inventory page in Hungarian: money formats in the rows and the preview, the form flows with their
 * toasts and field errors, the stale-edit message and the delete wording. English is asserted by the other catalog specs. */
import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { renamePartElsewhere } from './support/concurrent-changes';
import { errorToastMessage, toastMessage } from './support/toast';
import { MOCK_PART_IDS, type MockApiState } from './support/test-data';

/** Signs in through the session hint with the language preset to Hungarian. */
async function bootHungarian(page: Page): Promise<MockApiState> {
  await primeBrowserState(page, { language: 'hu', sessionHint: true });
  return installApiMocks(page, { profileEmail: 'mechanic.hu@example.test', isAuthenticated: true });
}

async function openInventory(page: Page, tab: 'parts' | 'labor-types'): Promise<void> {
  await page.goto(`/inventory?tab=${tab}`);
  await expect(page.getByTestId(tab === 'parts' ? 'inventory-parts-search-input' : 'inventory-labor-types-search-input')).toBeVisible();
}

test.describe('Inventory in Hungarian', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('rows and the create preview use the Hungarian money format, and creating toasts in Hungarian', async ({ page }) => {
    await bootHungarian(page);
    await openInventory(page, 'parts');
    const firstRow = page.getByTestId('catalog-item-row').first();

    await expect(firstRow).toContainText(/12\s000,00/);
    await expect(firstRow).toContainText(/15\s240,00/);

    await page.getByTestId('inventory-parts-create-button').click();
    const dialog = page.getByRole('dialog', { name: 'Alkatrész létrehozása' });
    await dialog.locator('#part-number').fill('clt-3003');
    await dialog.locator('#part-name').fill('Kuplungkészlet');
    await dialog.locator('#part-net-price').fill('5000');
    await expect(dialog.locator('#part-gross-price')).toHaveValue(/^6350,00\s+Ft$/);
    await dialog.getByRole('button', { name: 'Mentés' }).click();

    await expect(toastMessage(page, 'Alkatrész sikeresen létrehozva.')).toBeVisible();
    await expect(page.getByText('Kuplungkészlet', { exact: true })).toHaveCount(1);
  });

  test('a taken part number is refused in Hungarian on the field, and a labour type is created with its own toast', async ({ page }) => {
    await bootHungarian(page);
    await openInventory(page, 'parts');

    await page.getByTestId('inventory-parts-create-button').click();
    const dialog = page.getByRole('dialog', { name: 'Alkatrész létrehozása' });
    await dialog.locator('#part-number').fill('ALT-1001');
    await dialog.locator('#part-name').fill('Másik szíj');
    await dialog.locator('#part-net-price').fill('1000');
    await dialog.getByRole('button', { name: 'Mentés' }).click();

    await expect(errorToastMessage(page, 'Ez a cikkszám már szerepel a rendszerben.')).toBeVisible();
    await expect(dialog.locator('#part-number')).toHaveAttribute('aria-invalid', 'true');
    await dialog.getByRole('button', { name: 'Mégse' }).click();

    await openInventory(page, 'labor-types');
    await page.getByTestId('inventory-labor-types-create-button').click();
    const laborDialog = page.getByRole('dialog', { name: 'Munkadíjtípus létrehozása' });
    await laborDialog.locator('#labor-type-code').fill('LBR-BRK');
    await laborDialog.locator('#labor-type-name').fill('Fékszerviz');
    await laborDialog.locator('#labor-type-hourly-rate').fill('7000');
    await laborDialog.getByRole('button', { name: 'Mentés' }).click();
    await expect(toastMessage(page, 'Munkadíjtípus sikeresen létrehozva.')).toBeVisible();
  });

  test('a stale edit toasts the Hungarian conflict message and saves on the second try', async ({ page }) => {
    const state = await bootHungarian(page);
    await openInventory(page, 'parts');

    await page.getByRole('button', { name: 'Alkatrész szerkesztése' }).nth(1).click();
    const dialog = page.getByRole('dialog', { name: 'Alkatrész szerkesztése' });
    renamePartElsewhere(state, MOCK_PART_IDS.brakePad, 'Fékbetét (máshol átnevezve)');
    await dialog.locator('#part-net-price').fill('9500');
    await dialog.getByRole('button', { name: 'Mentés' }).click();

    await expect(errorToastMessage(page, 'Időközben valaki más módosította ezt a tételt. A lista újratöltődött, próbálja újra.')).toBeVisible();
    await expect(page.getByText('Fékbetét (máshol átnevezve)', { exact: true })).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Mentés' }).click();
    await expect(toastMessage(page, 'Alkatrész sikeresen frissítve.')).toBeVisible();
  });

  test('the empty state and the delete confirmation read in Hungarian', async ({ page }) => {
    await bootHungarian(page);
    await openInventory(page, 'parts');

    await page.getByTestId('inventory-parts-search-input').fill('zzz-nincs-ilyen');
    await expect(page.getByText('Nincs a szűrésnek megfelelő alkatrész.')).toBeVisible();
    await page.getByTestId('inventory-parts-search-clear').click();

    await page.getByRole('button', { name: 'Alkatrész törlése' }).first().click();
    const confirmDialog = page.getByRole('dialog', { name: 'Alkatrész törlésének megerősítése' });
    await expect(confirmDialog).toContainText('Timing belt (ALT-1001) törlése?');
    await confirmDialog.getByRole('button', { name: 'Alkatrész törlése' }).click();

    await expect(toastMessage(page, 'Alkatrész sikeresen törölve.')).toBeVisible();
  });
});
