/** Paging of the Inventory tabs and the Quotes list: viewport-sized pages, arrows, indicator, server search and filter. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CatalogPage, type CatalogItemKind, type CatalogTab } from './pages/catalog.page';
import { QuotesPage } from './pages/quotes.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import type { PaginationControls } from './support/pagination';
import { MOCK_QUOTE_IDS, type MockApiState } from './support/test-data';

const VIEWPORT = { width: 1280, height: 900 };
const QUOTE_NUMBER = /ARSM-\d{4}-\d{4}/;
const CATALOG_TOTAL = 42;
const SEARCH_MATCHES = 10;

/** Both catalog tabs: two fixture rows plus 40 seeded ones; "01" matches exactly ten identifiers (010-019). */
interface CatalogCase {
  readonly kind: CatalogItemKind;
  readonly tab: CatalogTab;
  readonly search: string;
  readonly seed: (state: MockApiState) => void;
}

const pad = (index: number): string => String(index).padStart(3, '0');
const SEEDED = Array.from({ length: 40 }, (_, index) => index + 1);

const CATALOG_CASES: readonly CatalogCase[] = [
  {
    kind: 'part',
    tab: 'parts',
    search: 'PRT-01',
    seed: (state) => {
      state.parts.push(...SEEDED.map((index) => (
        { id: 5000 + index, partNumber: `PRT-${pad(index)}`, name: `Seed part ${pad(index)}`, netUnitPrice: 1000, vatRatePercent: 27, grossUnitPrice: 1270 }
      )));
    },
  },
  {
    kind: 'laborType',
    tab: 'labor-types',
    search: 'LAB-01',
    seed: (state) => {
      state.laborTypes.push(...SEEDED.map((index) => (
        { id: 6000 + index, code: `LAB-${pad(index)}`, name: `Seed labour ${pad(index)}`, hourlyNetRate: 5000, vatRatePercent: 27, grossHourlyRate: 6350 }
      )));
    },
  },
];

/** Waits until the rows and the indicator agree on one page size above 1, and returns that size. */
async function settledPageSize(rows: Locator, controls: PaginationControls, total: number): Promise<number> {
  let pageSize = 0;
  await expect.poll(async () => {
    pageSize = await rows.count();
    const indicator = (await controls.indicator.count()) > 0 ? (await controls.indicator.innerText()).replaceAll(/\s+/g, ' ').trim() : '';
    return pageSize > 1 && indicator === `1 / ${String(Math.ceil(total / pageSize))}`;
  }).toBe(true);
  return pageSize;
}

/** Remaining vertical scroll of the page's scroll container; a fitted page leaves none. */
function scrollOverflowPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    return main === null ? Number.NaN : main.scrollHeight - main.clientHeight;
  });
}

async function bootPage(page: Page, seed?: (state: MockApiState) => void): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  seed?.(state);
  await new AuthPage(page).loginAsMechanic(env);
}

for (const catalogCase of CATALOG_CASES) {
  test.describe(`Pagination - ${catalogCase.tab}`, () => {
    const { kind, tab } = catalogCase;
    const total = CATALOG_TOTAL;

    test('shows a viewport-sized page with arrows, an indicator and the last partial page', async ({ page }) => {
      await bootPage(page, catalogCase.seed);
      const catalog = new CatalogPage(page);
      const rows = page.getByTestId('catalog-item-row');
      const controls = catalog.pagination(kind);
      await catalog.goto(tab);

      const pageSize = await settledPageSize(rows, controls, total);
      const pages = Math.ceil(total / pageSize);
      expect(pageSize).toBeLessThan(total);
      await expect(controls.previous).toBeDisabled();
      await expect(controls.next).toBeEnabled();

      const firstOnPageOne = await rows.first().innerText();
      await controls.next.click();
      await expect(controls.indicator).toHaveText(`2 / ${String(pages)}`);
      await expect(rows.first()).not.toHaveText(firstOnPageOne);
      await expect(controls.previous).toBeEnabled();

      for (let current = 2; current < pages; current += 1) {
        await controls.next.click();
        await expect(controls.indicator).toHaveText(`${String(current + 1)} / ${String(pages)}`);
      }
      await expect(controls.next).toBeDisabled();
      await expect(rows).toHaveCount(total - pageSize * (pages - 1));
    });

    test('fits the page into the viewport without scrolling the list area', async ({ page }) => {
      await bootPage(page, catalogCase.seed);
      const catalog = new CatalogPage(page);
      const controls = catalog.pagination(kind);
      await catalog.goto(tab);
      await settledPageSize(page.getByTestId('catalog-item-row'), controls, total);

      await expect.poll(() => scrollOverflowPx(page)).toBeLessThanOrEqual(1);
      await expect(controls.next).toBeInViewport();
    });

    test('grows and shrinks the page with the viewport height', async ({ page }) => {
      await bootPage(page, catalogCase.seed);
      const catalog = new CatalogPage(page);
      const rows = page.getByTestId('catalog-item-row');
      await catalog.goto(tab);
      const pageSize = await settledPageSize(rows, catalog.pagination(kind), total);

      await page.setViewportSize({ width: VIEWPORT.width, height: 600 });
      await expect.poll(() => rows.count()).toBeLessThan(pageSize);

      await page.setViewportSize({ width: VIEWPORT.width, height: 1200 });
      await expect.poll(() => rows.count()).toBeGreaterThan(pageSize);
    });

    test('searches on the server and returns to the first page', async ({ page }) => {
      await bootPage(page, catalogCase.seed);
      const catalog = new CatalogPage(page);
      const rows = page.getByTestId('catalog-item-row');
      const controls = catalog.pagination(kind);
      await catalog.goto(tab);
      const pageSize = await settledPageSize(rows, controls, total);

      await controls.next.click();
      await expect(controls.indicator).toHaveText(`2 / ${String(Math.ceil(total / pageSize))}`);

      await catalog.searchInput(kind).fill(catalogCase.search);
      await settledPageSize(rows, controls, SEARCH_MATCHES);
      await expect(rows.first()).toContainText(catalogCase.search);

      await catalog.searchClearButton(kind).click();
      await settledPageSize(rows, controls, total);
    });
  });
}

test.describe('Pagination - catalog tab switch', () => {
  test('starts the other tab, and the tab left behind, on page 1', async ({ page }) => {
    await bootPage(page, (state) => { CATALOG_CASES.forEach((catalogCase) => { catalogCase.seed(state); }); });
    const catalog = new CatalogPage(page);
    await catalog.goto('parts');
    const partControls = catalog.pagination('part');
    await expect(partControls.next).toBeEnabled();
    await partControls.next.click();
    await expect(partControls.indicator).toHaveText(/^2 \/ \d+$/);

    await catalog.tab('labor-types').click();
    await expect(catalog.pagination('laborType').indicator).toHaveText(/^1 \/ \d+$/);

    await catalog.tab('parts').click();
    await expect(partControls.indicator).toHaveText(/^1 \/ \d+$/);
  });
});

/** 24 extra quotes: even numbers are drafts, odd ones sent; titles "Bulk quote 01" to "Bulk quote 24". */
function seedBulkQuotes(state: MockApiState): void {
  const template = state.quotes.find((quote) => quote.id === MOCK_QUOTE_IDS.sentDiagnostics);
  if (!template) {
    throw new Error('The quote fixtures changed: the bulk seed needs the sent quote.');
  }

  for (let index = 1; index <= 24; index += 1) {
    const isDraft = index % 2 === 0;
    state.quotes.push({
      ...template,
      id: 8000 + index,
      quoteNumber: `ARSM-2026-02${String(index).padStart(2, '0')}`,
      title: `Bulk quote ${String(index).padStart(2, '0')}`,
      status: isDraft ? 'Draft' : 'Sent',
      sentAt: isDraft ? null : template.sentAt,
      createdAt: new Date(Date.UTC(2026, 5, index)).toISOString(),
      lines: [],
    });
  }
}

/** Quote numbers of the rows on the current page, in order. */
async function pageQuoteNumbers(quotes: QuotesPage): Promise<string[]> {
  const texts = await quotes.rows().allInnerTexts();
  return texts.map((text) => QUOTE_NUMBER.exec(text)?.[0] ?? text);
}

/** Walks every page with the next arrow and returns all quote numbers. */
async function collectQuoteNumbers(quotes: QuotesPage): Promise<string[]> {
  const controls = quotes.pagination();
  const numbers: string[] = [];
  for (;;) {
    const current = await pageQuoteNumbers(quotes);
    numbers.push(...current);
    if (await controls.next.isDisabled()) {
      return numbers;
    }
    await controls.next.click();
    await expect(quotes.rows().first()).not.toContainText(current[0] ?? '');
  }
}

test.describe('Pagination - quotes', () => {
  test('pages the list and reaches every quote once', async ({ page }) => {
    await bootPage(page, seedBulkQuotes);
    const quotes = new QuotesPage(page);
    await quotes.goto();
    const pageSize = await settledPageSize(quotes.rows(), quotes.pagination(), 27);
    expect(pageSize).toBeLessThan(27);

    const numbers = await collectQuoteNumbers(quotes);
    expect(numbers).toHaveLength(27);
    expect(new Set(numbers).size).toBe(27);
  });

  test('filters by status and searches on the server, starting over on page 1', async ({ page }) => {
    await bootPage(page, seedBulkQuotes);
    const quotes = new QuotesPage(page);
    await quotes.goto();
    await settledPageSize(quotes.rows(), quotes.pagination(), 27);
    await quotes.pagination().next.click();
    await expect(quotes.pagination().indicator).toHaveText(/^2 \/ \d+$/);

    await quotes.filterByStatus('Draft');
    await settledPageSize(quotes.rows(), quotes.pagination(), 13);
    await expect(quotes.rows().first().getByTestId('quote-status-badge')).toHaveText('Draft');
    expect(await collectQuoteNumbers(quotes)).toHaveLength(13);

    await quotes.searchInput().fill('Bulk quote 1');
    await settledPageSize(quotes.rows(), quotes.pagination(), 5);
    const drafts = await collectQuoteNumbers(quotes);
    expect(drafts.sort()).toEqual(['ARSM-2026-0210', 'ARSM-2026-0212', 'ARSM-2026-0214', 'ARSM-2026-0216', 'ARSM-2026-0218']);
  });
});
