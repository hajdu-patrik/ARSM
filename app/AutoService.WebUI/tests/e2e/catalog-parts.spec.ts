import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CatalogPage } from './pages/catalog.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import type { MockApiState } from './support/test-data';

/** Installs the catalog mock and logs in as a mechanic; returns the mutable mock state. */
async function prepareInventoryPage(page: Page): Promise<MockApiState> {
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  await new AuthPage(page).loginAsMechanic(env);
  return state;
}

test.describe('Inventory - Parts tab', () => {
  test('defaults to the Parts tab and shows net and gross unit price side by side', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await expect(page).toHaveURL(/\/inventory$/);
    await expect(catalogPage.tabButton('parts')).toHaveAttribute('aria-pressed', 'true');
    await expect(catalogPage.tabButton('labor-types')).toHaveAttribute('aria-pressed', 'false');

    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(2);
    await expect(page.getByText(/12,000\.00/)).toHaveCount(2);
    await expect(page.getByText(/15,240\.00/)).toHaveCount(2);
  });

  test('reflects the active tab in the URL when switching tabs', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await catalogPage.tabButton('labor-types').click();
    await expect(page).toHaveURL(/\/inventory\?tab=labor-types$/);
    await expect(page.getByText('Diagnostics', { exact: true })).toHaveCount(2);

    await catalogPage.tabButton('parts').click();
    await expect(page).toHaveURL(/\/inventory\?tab=parts$/);
    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(2);
  });

  test('shows only edit and delete actions for each part row', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    // Two fixture parts, and the row renders exactly one edit and one delete
    // action per part -- there is no separate detail/"view" action (D32).
    await expect(catalogPage.editButtons('part')).toHaveCount(2);
    await expect(catalogPage.deleteButtons('part')).toHaveCount(2);
  });

  test('toolbar search filters by name and by part number, and clearing restores the list', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await catalogPage.searchInput('part').fill('Timing');
    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(2);
    await expect(page.getByText('Brake pad set', { exact: true })).toHaveCount(0);

    await catalogPage.searchClearButton('part').click();
    await catalogPage.searchInput('part').fill('BRK');
    await expect(page.getByText('Brake pad set', { exact: true })).toHaveCount(2);
    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(0);

    await catalogPage.searchClearButton('part').click();
    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(2);
    await expect(page.getByText('Brake pad set', { exact: true })).toHaveCount(2);
  });

  test('toolbar sort toggles ascending/descending part-number order', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    const ascendingFirst = await catalogPage.openEdit('part', 0);
    await expect(ascendingFirst.getByLabel('Part number')).toHaveValue('ALT-1001');
    await ascendingFirst.getByRole('button', { name: 'Cancel' }).click();

    await catalogPage.sortToggle('part').click();
    const descendingFirst = await catalogPage.openEdit('part', 0);
    await expect(descendingFirst.getByLabel('Part number')).toHaveValue('BRK-2002');
  });

  test('create modal previews the gross price live and saves using the server-returned value', async ({ page }) => {
    const state = await prepareInventoryPage(page);
    // Deliberately not what net*vat would compute, so the row can only be
    // showing this because it came from the mocked POST response (D3/D19).
    state.catalogGrossOverride = 7777.77;
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    const dialog = await catalogPage.openCreate('part');
    await dialog.getByLabel('Part number').fill('CLT-3003');
    await dialog.getByLabel('Name').fill('Clutch kit');
    await dialog.getByLabel('Net unit price').fill('5000');
    await expect(dialog.getByLabel('Gross unit price (preview)')).toHaveValue(/6,350\.00/);

    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(catalogPage.formDialog('Create part')).toHaveCount(0);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Part created successfully.');
    await expect(page.getByText('Clutch kit', { exact: true })).toHaveCount(2);
    await expect(page.getByText(/7,777\.77/)).toHaveCount(2);
  });

  test('edits a part and reloads the row from the server response after the 204 PUT', async ({ page }) => {
    const state = await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    const dialog = await catalogPage.openEdit('part', 1);
    await expect(dialog.getByLabel('Part number')).toHaveValue('BRK-2002');

    // Set only after the modal opened, proving the row cannot have this
    // value until the mocked PUT (204) is followed by a fresh GET reload.
    state.catalogGrossOverride = 8888.88;
    await dialog.getByLabel('Net unit price').fill('9500');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(catalogPage.formDialog('Edit part')).toHaveCount(0);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Part updated successfully.');
    await expect(page.getByText(/8,888\.88/)).toHaveCount(2);
    await expect(page.getByText(/10,160\.00/)).toHaveCount(0);
  });

  test('delete confirmation states the quote-snapshot effect and removes the row', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    const dialog = await catalogPage.openDelete('part', 0);
    await expect(dialog).toContainText(/Existing quotes keep this item's saved name, price, and VAT rate/);
    await dialog.getByRole('button', { name: 'Delete part' }).click();

    await expect(catalogPage.formDialog('Confirm part deletion')).toHaveCount(0);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Part deleted successfully.');
    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(0);
  });

  test('surfaces the backend duplicate part number conflict on create', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    const dialog = await catalogPage.openCreate('part');
    await dialog.getByLabel('Part number').fill('ALT-1001');
    await dialog.getByLabel('Name').fill('Duplicate timing belt');
    await dialog.getByLabel('Net unit price').fill('1000');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('output[aria-live="polite"]')).toContainText('A part with this part number already exists.');
    await expect(catalogPage.formDialog('Create part')).toBeVisible();
  });
});
