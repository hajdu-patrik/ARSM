import { expect, test } from '@playwright/test';
import { CatalogPage } from './pages/catalog.page';
import { renameLaborTypeElsewhere } from './support/concurrent-changes';
import { errorToastMessage } from './support/toast';
import { MOCK_LABOR_TYPE_IDS } from './support/test-data';
import { signInWithMocks } from './support/sign-in';

test.describe('Inventory - Labour types tab', () => {
  // Tall enough that the page-sized list shows every fixture row at once.
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('deep links directly to the Labour types tab via the tab query param', async ({ page }) => {
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto('labor-types');

    await expect(catalogPage.tab('labor-types')).toHaveAttribute('aria-selected', 'true');
    await expect(catalogPage.tab('parts')).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByText('Oil change', { exact: true })).toHaveCount(1);
    await expect(catalogPage.searchInput('laborType')).toBeVisible();
  });

  test('shows code, hourly rate, VAT, and gross hourly rate, with only edit and delete actions', async ({ page }) => {
    await signInWithMocks(page);
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
    await signInWithMocks(page);
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
    const state = await signInWithMocks(page);
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

  test('a stale edit toasts the conflict, reloads the list and saves on the second try', async ({ page }) => {
    const state = await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto('labor-types');

    const dialog = await catalogPage.openEdit('laborType', 1);
    await expect(dialog.getByLabel('Code')).toHaveValue('LBR-OIL');

    // Another user saved this labour type first, so the version this dialog holds is stale.
    renameLaborTypeElsewhere(state, MOCK_LABOR_TYPE_IDS.oilChange, 'Oil change (renamed elsewhere)');
    const reloadedLaborType = page.waitForResponse((response) => (
      response.request().method() === 'GET' && response.url().endsWith(`/api/labor-types/${String(MOCK_LABOR_TYPE_IDS.oilChange)}`)
    ));
    await dialog.getByLabel('Hourly rate (net)').fill('6500');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'Someone else changed this item in the meantime. The list has been reloaded, please try again.')).toBeVisible();
    await reloadedLaborType;
    await expect(page.getByText('Oil change (renamed elsewhere)', { exact: true })).toHaveCount(1);

    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(catalogPage.formDialog('Edit labour type')).toHaveCount(0);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Labour type updated successfully.');
    await expect(page.getByText(/6,500\.00/)).toHaveCount(1);
  });

  test('delete confirmation states the quote-snapshot effect and removes the row', async ({ page }) => {
    await signInWithMocks(page);
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
