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

test.describe('Inventory - Labour types tab', () => {
  // Tall enough that the page-sized list shows every fixture row at once.
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('deep links directly to the Labour types tab via the tab query param', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto('labor-types');

    await expect(catalogPage.tab('labor-types')).toHaveAttribute('aria-selected', 'true');
    await expect(catalogPage.tab('parts')).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByText('Oil change', { exact: true })).toHaveCount(1);
    await expect(catalogPage.searchInput('laborType')).toBeVisible();
  });

  test('shows code, hourly rate, VAT, and gross hourly rate, with only edit and delete actions', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto('labor-types');

    await expect(page.getByText('LBR-DIAG', { exact: true })).toHaveCount(1);
    await expect(page.getByText(/9,000\.00/)).toHaveCount(1);
    await expect(page.getByText(/11,430\.00/)).toHaveCount(1);

    // Two fixture labour types, one edit and one delete action per row --
    // no separate detail/"view" action (D32).
    await expect(catalogPage.editButtons('laborType')).toHaveCount(2);
    await expect(catalogPage.deleteButtons('laborType')).toHaveCount(2);
  });

  test('toolbar search filters labor types by name and by code', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto('labor-types');

    await catalogPage.searchInput('laborType').fill('Diagnostics');
    await expect(page.getByText('Diagnostics', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Oil change', { exact: true })).toHaveCount(0);

    await catalogPage.searchClearButton('laborType').click();
    await catalogPage.searchInput('laborType').fill('LBR-OIL');
    await expect(page.getByText('Oil change', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Diagnostics', { exact: true })).toHaveCount(0);
  });

  test('creates a labour type and shows the new row using the server-returned gross hourly rate', async ({ page }) => {
    const state = await prepareInventoryPage(page);
    // Deliberately not what net*vat would compute -- proves the row reads
    // the mocked POST response rather than recomputing the preview formula.
    state.catalogGrossOverride = 6543.21;
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto('labor-types');

    const dialog = await catalogPage.openCreate('laborType');
    await dialog.getByLabel('Code').fill('LBR-BRK');
    await dialog.getByLabel('Name').fill('Brake service');
    await dialog.getByLabel('Hourly rate (net)').fill('7000');
    await expect(dialog.getByLabel('Gross hourly rate (preview)')).toHaveValue(/8,890\.00/);

    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(catalogPage.formDialog('Create labour type')).toHaveCount(0);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Labour type created successfully.');
    await expect(page.getByText('Brake service', { exact: true })).toHaveCount(1);
    await expect(page.getByText(/6,543\.21/)).toHaveCount(1);
  });

  test('delete confirmation states the quote-snapshot effect and removes the row', async ({ page }) => {
    await prepareInventoryPage(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto('labor-types');

    const dialog = await catalogPage.openDelete('laborType', 0);
    await expect(dialog).toContainText(/Existing quotes keep this item's saved name, price, and VAT rate/);
    await dialog.getByRole('button', { name: 'Delete labour type' }).click();

    await expect(catalogPage.formDialog('Confirm labour type deletion')).toHaveCount(0);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Labour type deleted successfully.');
    await expect(page.getByText('Diagnostics', { exact: true })).toHaveCount(0);
  });
});
