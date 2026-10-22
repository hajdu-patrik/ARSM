/** VAT dropdown choices (5, 18, 27; 27 default), a stored 0% row staying listed, and the full catalog in the quote pickers. */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CatalogPage } from './pages/catalog.page';
import { QuotesPage } from './pages/quotes.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import { expectDropdownLabel, readDropdownOptionValues } from './support/dropdown';
import type { MockApiState } from './support/test-data';

const ALLOWED_VAT_VALUES = ['5', '18', '27'];
const EXTRA_CATALOG_ROWS = 30;

/** Mocks the API, lets the caller seed the state, and signs in as a mechanic on a tall viewport. */
async function boot(page: Page, seed?: (state: MockApiState) => void): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  seed?.(state);
  await new AuthPage(page).loginAsMechanic(env);
}

test.describe('VAT options - catalog forms', () => {
  test('the part form offers exactly 5, 18 and 27 and defaults to 27', async ({ page }) => {
    await boot(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('parts');

    const dialog = await catalog.openCreate('part');
    await expectDropdownLabel(dialog.getByTestId('part-vat-rate'), '27%');
    expect(await readDropdownOptionValues(page, 'part-vat-rate')).toEqual(ALLOWED_VAT_VALUES);
    // Escape closed only the list, not the dialog.
    await expect(dialog).toBeVisible();
  });

  test('the labour type form offers exactly 5, 18 and 27 and defaults to 27', async ({ page }) => {
    await boot(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('labor-types');

    const dialog = await catalog.openCreate('laborType');
    await expectDropdownLabel(dialog.getByTestId('labor-type-vat-rate'), '27%');
    expect(await readDropdownOptionValues(page, 'labor-type-vat-rate')).toEqual(ALLOWED_VAT_VALUES);
    await expect(dialog).toBeVisible();
  });

  test('a new part is saved with the chosen rate and listed with it', async ({ page }) => {
    await boot(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('parts');

    const dialog = await catalog.openCreate('part');
    await dialog.getByLabel('Part number').fill('VAT-0018');
    await dialog.getByLabel('Name').fill('Eighteen percent part');
    await dialog.getByLabel('Net unit price').fill('1000');
    await dialog.getByTestId('part-vat-rate').click();
    await page.getByTestId('part-vat-rate-option-18').click();
    await expectDropdownLabel(dialog.getByTestId('part-vat-rate'), '18%');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(catalog.formDialog('Create part')).toHaveCount(0);
    await catalog.searchInput('part').fill('VAT-0018');
    await expect(page.getByTestId('catalog-item-row')).toHaveCount(1);
    await expect(page.getByTestId('catalog-item-row').locator('[data-column="vat"]')).toContainText('18%');
  });
});

test.describe('VAT options - stored 0% rows', () => {
  test('a legacy 0% part and labour type are still listed with their rate', async ({ page }) => {
    await boot(page, (state) => {
      state.parts.push({ id: 5901, partNumber: 'LEGACY-P', name: 'Legacy part', netUnitPrice: 1000, vatRatePercent: 0, grossUnitPrice: 1000, version: 1 });
      state.laborTypes.push({ id: 6901, code: 'LEGACY-L', name: 'Legacy labour', hourlyNetRate: 4000, vatRatePercent: 0, grossHourlyRate: 4000, version: 1 });
    });
    const catalog = new CatalogPage(page);
    const rows = page.getByTestId('catalog-item-row');
    await catalog.goto('parts');

    await catalog.searchInput('part').fill('LEGACY');
    await expect(rows).toHaveCount(1);
    await expect(rows.locator('[data-column="vat"]')).toContainText('0%');

    await catalog.tab('labor-types').click();
    await catalog.searchInput('laborType').fill('LEGACY');
    await expect(rows).toHaveCount(1);
    await expect(rows.locator('[data-column="vat"]')).toContainText('0%');
  });
});

test.describe('VAT options - quote line form', () => {
  test('offers exactly 5, 18 and 27 and defaults to 27', async ({ page }) => {
    await boot(page);
    const quotes = new QuotesPage(page);
    await quotes.goto();
    await quotes.openQuote('ARSM-2026-0001');

    await page.getByTestId('quote-add-line-button').click();
    const editor = page.getByTestId('quote-line-editor');
    await expectDropdownLabel(editor.getByTestId('quote-line-vat-select'), '27%');
    expect(await readDropdownOptionValues(page, 'quote-line-vat-select')).toEqual(ALLOWED_VAT_VALUES);
    await expect(editor).toBeVisible();
  });
});

test.describe('VAT options - quote pickers use the full catalog', () => {
  function seedLongCatalogs(state: MockApiState): void {
    for (let index = 1; index <= EXTRA_CATALOG_ROWS; index += 1) {
      const suffix = String(index).padStart(3, '0');
      state.parts.push({ id: 5000 + index, partNumber: `PRT-${suffix}`, name: `Seed part ${suffix}`, netUnitPrice: 1000, vatRatePercent: 27, grossUnitPrice: 1270, version: 1 });
      state.laborTypes.push({ id: 6000 + index, code: `LAB-${suffix}`, name: `Seed labour ${suffix}`, hourlyNetRate: 5000, vatRatePercent: 27, grossHourlyRate: 6350, version: 1 });
    }
  }

  test('lists parts and labour types beyond the first 20 and asks for 500 per page', async ({ page }) => {
    const catalogUrls: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/(parts|labor-types)\?/.test(request.url())) {
        catalogUrls.push(request.url());
      }
    });
    await boot(page, seedLongCatalogs);
    const quotes = new QuotesPage(page);
    await quotes.goto();
    await quotes.openQuote('ARSM-2026-0001');

    await page.getByTestId('quote-add-line-button').click();
    const catalogSelect = page.getByTestId('quote-line-catalog-select');
    await catalogSelect.click();
    await expect(page.getByTestId(`quote-line-catalog-select-option-${String(5000 + EXTRA_CATALOG_ROWS)}`)).toBeAttached();
    await page.keyboard.press('Escape');

    await page.getByTestId('quote-line-kind-labor').click();
    await catalogSelect.click();
    await expect(page.getByTestId(`quote-line-catalog-select-option-${String(6000 + EXTRA_CATALOG_ROWS)}`)).toBeAttached();
    await page.keyboard.press('Escape');

    expect(catalogUrls.some((url) => url.includes('/api/parts?') && url.includes('pageSize=500'))).toBe(true);
    expect(catalogUrls.some((url) => url.includes('/api/labor-types?') && url.includes('pageSize=500'))).toBe(true);
  });
});
