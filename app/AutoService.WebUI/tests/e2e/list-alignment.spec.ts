/**
 * Column-alignment regression coverage for the shared `DataList` component
 * across every list it renders: the Quotes list, the quote-line lists inside
 * the editor (editable and read-only), the Inventory parts and labor types
 * lists, and the Company results month and VAT lists. Stresses the
 * worst-case content the shared grid has to hold without ever drifting a
 * column, in both languages and both themes, and exercises the
 * container-query breakpoint the collapsible sidebar can push a list across.
 */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CatalogPage } from './pages/catalog.page';
import { QuotesPage } from './pages/quotes.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import { seedWorstCaseListData } from './support/list-alignment-fixtures';
import { expectColumnsAligned, expectRowActionsAligned, listSection } from './support/list-alignment';

type Lang = 'en' | 'hu';
type Theme = 'light' | 'dark';

const VIEWPORT = { width: 1440, height: 900 };
const FRACTIONAL_QUANTITY_TEXT: Record<Lang, string> = { en: '1.5', hu: '1,5' };

/**
 * Combos exercised for the full (a)+(b)+(d) sweep. Restricted to the two the
 * plan calls mandatory: the existing suite already runs close to the
 * canonical runner's default command budget end to end, and every extra
 * login-and-sweep combo here adds a meaningful slice on top of that.
 */
const COMBOS: ReadonlyArray<{ lang: Lang; theme: Theme }> = [
  { lang: 'en', theme: 'light' },
  { lang: 'hu', theme: 'dark' },
];

/** Installs the mock, seeds worst-case list data, forces the theme before login, and logs in. */
async function bootListAlignment(page: Page, lang: Lang, theme: Theme): Promise<void> {
  await page.addInitScript((value) => localStorage.setItem('preferred-theme', value), theme);

  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  seedWorstCaseListData(state);

  await new AuthPage(page).loginAsMechanic(env, lang);
}

/**
 * Forces the sidebar's collapsed state from the next navigation on. Must run
 * after `loginAsMechanic`: `AuthPage` registers its own init script that
 * resets `preferred-sidebar-collapsed` to `'false'` on every navigation, and
 * init scripts run in registration order, so this one has to be added later
 * to win.
 */
async function forceSidebarCollapsed(page: Page, collapsed: boolean): Promise<void> {
  await page.addInitScript((value) => localStorage.setItem('preferred-sidebar-collapsed', value), collapsed ? 'true' : 'false');
}

/** Runs the (a)+(b)+(d) sweep across every list, once the session is already booted. */
async function expectListsAligned(page: Page, lang: Lang): Promise<void> {
  const quotesPage = new QuotesPage(page);
  const catalogPage = new CatalogPage(page);

  await quotesPage.goto();
  await expect(quotesPage.rows().first()).toBeVisible();
  await expectColumnsAligned(listSection(quotesPage.rows().first()), { skipWidthColumns: [2] });
  await expectRowActionsAligned(quotesPage.rows(), ['quote-open-button', 'quote-download-button', 'quote-delete-button']);

  await quotesPage.openQuote('ARSM-2026-0001');
  await expect(quotesPage.lineRows().first()).toBeVisible();
  const fractionalLine = quotesPage.lineRows().filter({ hasText: 'Diagnosztika' });
  await expect(fractionalLine.getByTestId('data-list-row-cells')).toContainText(FRACTIONAL_QUANTITY_TEXT[lang]);
  await expectColumnsAligned(listSection(quotesPage.lineRows().first()), { expectedColumnCount: 7 });
  await quotesPage.closeEditorButton().click();

  await quotesPage.openQuote('ARSM-2026-0002');
  await expect(quotesPage.lineRows().first()).toBeVisible();
  await expectColumnsAligned(listSection(quotesPage.lineRows().first()), { expectedColumnCount: 6 });
  await quotesPage.closeEditorButton().click();

  await catalogPage.goto('parts');
  await expect(page.getByTestId('catalog-item-row').first()).toBeVisible();
  await expectColumnsAligned(listSection(page.getByTestId('catalog-item-row').first()));

  await catalogPage.tabButton('labor-types').click();
  await expect(page.getByTestId('catalog-item-row').first()).toBeVisible();
  await expectColumnsAligned(listSection(page.getByTestId('catalog-item-row').first()));

  await page.goto('/company-results');
  await page.getByTestId('company-results-year').selectOption('2026');
  await expect(page.getByTestId('company-results-vat-row').first()).toBeVisible();
  await expectColumnsAligned(listSection(page.getByTestId('company-results-month-row').first()));
  await expectColumnsAligned(listSection(page.getByTestId('company-results-vat-row').first()));
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

    await page.setViewportSize({ width: 1024, height: 900 });

    await forceSidebarCollapsed(page, false);
    await quotesPage.goto();
    await expect(quotesPage.rows().first()).toBeVisible();
    await expect(page.getByTestId('data-list-header')).toBeHidden();
    await expect(quotesPage.rows().first().getByTestId('data-list-row-cells')).toBeHidden();
    await expect(quotesPage.rows().first().getByTestId('data-list-row-tiles')).toBeVisible();

    await forceSidebarCollapsed(page, true);
    await quotesPage.goto();
    await expect(quotesPage.rows().first()).toBeVisible();
    await expect(page.getByTestId('data-list-header')).toBeVisible();
    await expect(quotesPage.rows().first().getByTestId('data-list-row-cells')).toBeVisible();
    await expect(quotesPage.rows().first().getByTestId('data-list-row-tiles')).toBeHidden();

    await page.setViewportSize({ width: 320, height: 900 });
    await quotesPage.goto();
    await expect(quotesPage.rows().first()).toBeVisible();
    await expect(quotesPage.rows().first().getByTestId('data-list-row-tiles')).toBeVisible();

    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(hasNoHorizontalOverflow).toBe(true);
  });
});
