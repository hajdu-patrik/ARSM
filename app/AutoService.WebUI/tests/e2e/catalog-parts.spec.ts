import { expect, test } from '@playwright/test';
import { CatalogPage } from './pages/catalog.page';
import { renamePartElsewhere } from './support/concurrent-changes';
import { errorToastMessage } from './support/toast';
import { MOCK_PART_IDS } from './support/test-data';
import { signInWithMocks } from './support/sign-in';

test.describe('Inventory - Parts tab', () => {
  // Tall enough that the page-sized list shows every fixture row at once.
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('defaults to the Parts tab and shows net and gross unit price side by side', async ({ page }) => {
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await expect(page).toHaveURL(/\/inventory$/);
    await expect(catalogPage.tab('parts')).toHaveAttribute('aria-selected', 'true');
    await expect(catalogPage.tab('labor-types')).toHaveAttribute('aria-selected', 'false');

    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(1);
    await expect(page.getByText(/12,000\.00/)).toHaveCount(1);
    await expect(page.getByText(/15,240\.00/)).toHaveCount(1);
  });

  test('reflects the active tab in the URL when switching tabs', async ({ page }) => {
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await catalogPage.tab('labor-types').click();
    await expect(page).toHaveURL(/\/inventory\?tab=labor-types$/);
    await expect(page.getByText('Diagnostics', { exact: true })).toHaveCount(1);

    await catalogPage.tab('parts').click();
    await expect(page).toHaveURL(/\/inventory\?tab=parts$/);
    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(1);
  });

  test('moves between the tabs with the arrow keys', async ({ page }) => {
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await catalogPage.tab('parts').focus();
    await page.keyboard.press('ArrowRight');

    await expect(page).toHaveURL(/\/inventory\?tab=labor-types$/);
    await expect(catalogPage.tab('labor-types')).toBeFocused();
    await expect(catalogPage.tab('labor-types')).toHaveAttribute('aria-selected', 'true');
  });

  test('shows only edit and delete actions for each part row', async ({ page }) => {
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    // Two fixture parts, and the row renders exactly one edit and one delete
    // action per part -- there is no separate detail/"view" action (D32).
    await expect(catalogPage.editButtons('part')).toHaveCount(2);
    await expect(catalogPage.deleteButtons('part')).toHaveCount(2);
  });

  test('toolbar search filters by name and by part number, and clearing restores the list', async ({ page }) => {
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await catalogPage.searchInput('part').fill('Timing');
    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Brake pad set', { exact: true })).toHaveCount(0);

    await catalogPage.searchClearButton('part').click();
    await catalogPage.searchInput('part').fill('BRK');
    await expect(page.getByText('Brake pad set', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(0);

    await catalogPage.searchClearButton('part').click();
    await expect(page.getByText('Timing belt', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Brake pad set', { exact: true })).toHaveCount(1);
  });

  test('lists parts in ascending part-number order and offers no sort toggle', async ({ page }) => {
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await expect(page.getByTestId('inventory-parts-sort-toggle')).toHaveCount(0);
    const first = await catalogPage.openEdit('part', 0);
    await expect(first.getByLabel('Part number')).toHaveValue('ALT-1001');
    await first.getByRole('button', { name: 'Cancel' }).click();

    const second = await catalogPage.openEdit('part', 1);
    await expect(second.getByLabel('Part number')).toHaveValue('BRK-2002');
  });

  test('create modal previews the gross price live and saves using the server-returned value', async ({ page }) => {
    const state = await signInWithMocks(page);
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
    await expect(page.getByText('Clutch kit', { exact: true })).toHaveCount(1);
    await expect(page.getByText(/7,777\.77/)).toHaveCount(1);
  });

  test('edits a part and reloads the row from the server response after the 204 PUT', async ({ page }) => {
    const state = await signInWithMocks(page);
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
    await expect(page.getByText(/8,888\.88/)).toHaveCount(1);
    await expect(page.getByText(/10,160\.00/)).toHaveCount(0);
  });

  test('a stale edit toasts the conflict, reloads the list and saves on the second try', async ({ page }) => {
    const state = await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    const dialog = await catalogPage.openEdit('part', 1);
    await expect(dialog.getByLabel('Part number')).toHaveValue('BRK-2002');

    // Another user saved this part first, so the version this dialog holds is stale.
    renamePartElsewhere(state, MOCK_PART_IDS.brakePad, 'Brake pad set (renamed elsewhere)');
    const reloadedPart = page.waitForResponse((response) => (
      response.request().method() === 'GET' && response.url().endsWith(`/api/parts/${String(MOCK_PART_IDS.brakePad)}`)
    ));
    await dialog.getByLabel('Net unit price').fill('9500');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'Someone else changed this item in the meantime. The list has been reloaded, please try again.')).toBeVisible();
    await reloadedPart;
    await expect(page.getByText('Brake pad set (renamed elsewhere)', { exact: true })).toHaveCount(1);
    await expect(catalogPage.formDialog('Edit part')).toBeVisible();

    // The dialog now holds the current version, so saving again goes through.
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(catalogPage.formDialog('Edit part')).toHaveCount(0);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Part updated successfully.');
    await expect(page.getByText('Brake pad set', { exact: true })).toHaveCount(1);
    await expect(page.getByText(/9,500\.00/)).toHaveCount(1);
  });

  test('delete confirmation states the quote-snapshot effect and removes the row', async ({ page }) => {
    await signInWithMocks(page);
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
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    const dialog = await catalogPage.openCreate('part');
    await dialog.getByLabel('Part number').fill('ALT-1001');
    await dialog.getByLabel('Name').fill('Duplicate timing belt');
    await dialog.getByLabel('Net unit price').fill('1000');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'A part with this part number already exists.')).toBeVisible();
    await expect(catalogPage.formDialog('Create part')).toBeVisible();
    // The message is also bound to the field it concerns.
    const partNumberInput = dialog.getByLabel('Part number');
    await expect(partNumberInput).toHaveAttribute('aria-invalid', 'true');
    await expect(partNumberInput).toHaveAccessibleDescription('A part with this part number already exists.');
  });

  test('keeps keyboard focus inside the dialog and hands it back to the opener', async ({ page }) => {
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    const dialog = await catalogPage.openCreate('part');
    await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();

    // More Tab presses than the dialog has tab stops: focus wraps instead of leaving the dialog.
    for (let press = 0; press < 12; press += 1) {
      await page.keyboard.press('Tab');
    }
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(catalogPage.createButton('part')).toBeFocused();
  });

  test('dismisses the dialog from its backdrop', async ({ page }) => {
    await signInWithMocks(page);
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    const dialog = await catalogPage.openCreate('part');
    // The backdrop is a button that fills the viewport behind the dialog; click its top-left corner.
    await page.getByRole('button', { name: 'Dismiss dialog' }).click({ position: { x: 4, y: 4 } });

    await expect(dialog).toHaveCount(0);
  });
});
