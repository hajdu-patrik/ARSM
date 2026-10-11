/** Column-alignment regression coverage for every `DataList` list, both languages and themes;
 * tests/CLAUDE.md (Coverage Anchors) keeps the exact lists and checks. */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CatalogPage } from './pages/catalog.page';
import { QuotesPage } from './pages/quotes.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import type { TestLanguage, TestTheme } from './support/browser-state';
import { seedWorstCaseListData } from './support/list-alignment-fixtures';
import { expectColumnsAligned, expectRowActionsAligned, listSection } from './support/list-alignment';

const VIEWPORT = { width: 1440, height: 900 };
const FRACTIONAL_QUANTITY_TEXT: Record<TestLanguage, string> = { en: '1.5', hu: '1,5' };

/** The `data-column` keys every row of each list exposes, in table order. */
const QUOTE_COLUMNS = ['quote', 'vehicle', 'status', 'validUntil', 'totalNet', 'totalGross', 'actions'];
const QUOTE_LINE_COLUMNS = ['description', 'quantity', 'unitPrice', 'vat', 'net', 'gross'];
const CATALOG_COLUMNS = ['name', 'identifier', 'net', 'vat', 'gross', 'actions'];
const MONTH_COLUMNS = ['month', 'quotes', 'net', 'gross'];
const VAT_COLUMNS = ['vatRate', 'taxBase', 'tax'];

/** Labelled value tiles of a quote row in the tile layout: vehicle, valid until, net and gross total. */
const QUOTE_TILE_LABEL_COUNT = 4;

/** Restricted to the two mandatory combos (en/light, hu/dark): the full 2x2 sweep already
 * pushes past the runner's 300s default (tests/CLAUDE.md Coverage Anchors). */
const COMBOS: ReadonlyArray<{ lang: TestLanguage; theme: TestTheme }> = [
  { lang: 'en', theme: 'light' },
  { lang: 'hu', theme: 'dark' },
];

/** Installs the mock, seeds worst-case list data, forces the theme before login, and logs in. */
async function bootListAlignment(page: Page, lang: TestLanguage, theme: TestTheme): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem('preferred-theme', value);
  }, theme);

  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  seedWorstCaseListData(state);

  await new AuthPage(page).loginAsMechanic(env, lang);
}

/** Forces the sidebar collapsed from here on; must run after `loginAsMechanic`, because init
 * scripts apply in registration order and its own would otherwise reset this back to `'false'`. */
async function forceSidebarCollapsed(page: Page, collapsed: boolean): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem('preferred-sidebar-collapsed', value);
  }, collapsed ? 'true' : 'false');
}

/** Runs the (a)+(b)+(d) sweep across every list, once the session is already booted. */
async function expectListsAligned(page: Page, lang: TestLanguage): Promise<void> {
  const quotesPage = new QuotesPage(page);
  const catalogPage = new CatalogPage(page);
  const catalogRows = page.getByTestId('catalog-item-row');

  await quotesPage.goto();
  await expect(quotesPage.rows().first()).toBeVisible();
  await expectColumnsAligned(quotesPage.rows(), { expectedColumns: QUOTE_COLUMNS });
  await expectRowActionsAligned(quotesPage.rows(), ['quote-open-button', 'quote-download-button', 'quote-delete-button']);

  await quotesPage.openQuote('ARSM-2026-0001');
  await expect(quotesPage.lineRows().first()).toBeVisible();
  const fractionalLine = quotesPage.lineRows().filter({ hasText: 'Diagnosztika' });
  await expect(fractionalLine.locator('[data-column="quantity"]')).toContainText(FRACTIONAL_QUANTITY_TEXT[lang]);
  await expectColumnsAligned(quotesPage.lineRows(), { expectedColumns: [...QUOTE_LINE_COLUMNS, 'actions'] });
  await quotesPage.closeEditorButton().click();

  await quotesPage.openQuote('ARSM-2026-0002');
  await expect(quotesPage.lineRows().first()).toBeVisible();
  await expectColumnsAligned(quotesPage.lineRows(), { expectedColumns: QUOTE_LINE_COLUMNS });
  await quotesPage.closeEditorButton().click();

  await catalogPage.goto('parts');
  await expect(catalogRows.first()).toBeVisible();
  await expectColumnsAligned(catalogRows, { expectedColumns: CATALOG_COLUMNS });

  await catalogPage.tab('labor-types').click();
  await expect(catalogPage.tab('labor-types')).toHaveAttribute('aria-selected', 'true');
  await expect(catalogRows.first()).toBeVisible();
  await expectColumnsAligned(catalogRows, { expectedColumns: CATALOG_COLUMNS });

  await page.goto('/company-results');
  await page.getByTestId('company-results-year').selectOption('2026');
  await expect(page.getByTestId('company-results-vat-row').first()).toBeVisible();
  await expectColumnsAligned(page.getByTestId('company-results-month-row'), { expectedColumns: MONTH_COLUMNS });
  await expectColumnsAligned(page.getByTestId('company-results-vat-row'), { expectedColumns: VAT_COLUMNS });
}

test.describe('List alignment', () => {
  for (const combo of COMBOS) {
    test(`aligns every column in ${combo.lang}/${combo.theme} at 1440x900`, async ({ page }) => {
      await page.setViewportSize(VIEWPORT);
      await bootListAlignment(page, combo.lang, combo.theme);
      await expectListsAligned(page, combo.lang);
    });
  }

  test('the quotes list switches between table and tiles as the sidebar changes the available width', async ({ page }) => {
    await bootListAlignment(page, 'en', 'light');
    const quotesPage = new QuotesPage(page);
    const firstRow = quotesPage.rows().first();
    const header = page.getByTestId('data-list-header');
    const visibleTileLabels = firstRow.getByTestId('data-list-cell-label').filter({ visible: true });

    await page.setViewportSize({ width: 1024, height: 900 });

    await forceSidebarCollapsed(page, false);
    await quotesPage.goto();
    await expect(firstRow).toBeVisible();
    await expect(header).toBeHidden();
    await expect(listSection(firstRow)).toHaveAttribute('role', 'list');
    await expect(visibleTileLabels).toHaveCount(QUOTE_TILE_LABEL_COUNT);

    await forceSidebarCollapsed(page, true);
    await quotesPage.goto();
    await expect(firstRow).toBeVisible();
    await expect(header).toBeVisible();
    await expect(listSection(firstRow)).toHaveAttribute('role', 'table');
    await expect(visibleTileLabels).toHaveCount(0);

    await page.setViewportSize({ width: 320, height: 900 });
    await quotesPage.goto();
    await expect(firstRow).toBeVisible();
    await expect(header).toBeHidden();
    await expect(visibleTileLabels).toHaveCount(QUOTE_TILE_LABEL_COUNT);

    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(hasNoHorizontalOverflow).toBe(true);
  });
});
