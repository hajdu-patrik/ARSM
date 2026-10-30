/** Paging of the Quotes list: viewport-sized pages with arrows and an indicator, every quote once, no
 * scrolling of the list area, the page size following the viewport height, and chip plus search from page 1. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { bootPagedPage, scrollOverflowPx, settledPageSize } from './support/paging-helpers';
import { MOCK_QUOTE_IDS, type MockApiState } from './support/test-data';

const VIEWPORT = { width: 1280, height: 900 };
const QUOTE_NUMBER = /ARSM-\d{4}-\d{4}/;
const FIXTURE_QUOTES = 3;
const BULK_QUOTES = 24;
const TOTAL = FIXTURE_QUOTES + BULK_QUOTES;

/** 24 extra quotes: even numbers are drafts, odd ones sent; titles "Bulk quote 01" to "Bulk quote 24". */
function seedBulkQuotes(state: MockApiState): void {
  const template = state.quotes.find((quote) => quote.id === MOCK_QUOTE_IDS.sentDiagnostics);
  if (!template) {
    throw new Error('The quote fixtures changed: the bulk seed needs the sent quote.');
  }

  for (let index = 1; index <= BULK_QUOTES; index += 1) {
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

/** The quote numbers of the rows on the current page. */
async function pageQuoteNumbers(quotes: QuotesPage): Promise<string[]> {
  const texts = await quotes.rows().allInnerTexts();
  return texts.map((text) => QUOTE_NUMBER.exec(text)?.[0] ?? text);
}

/** Walks every page with the next arrow and returns all quote numbers in list order. */
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
  test('shows a viewport-sized page with arrows and an indicator, and ends on a partial last page', async ({ page }) => {
    await bootPagedPage(page, VIEWPORT, seedBulkQuotes);
    const quotes = new QuotesPage(page);
    const controls = quotes.pagination();
    await quotes.goto();

    const pageSize = await settledPageSize(quotes.rows(), controls, TOTAL);
    const pages = Math.ceil(TOTAL / pageSize);
    expect(pageSize).toBeLessThan(TOTAL);
    await expect(controls.previous).toBeDisabled();
    await expect(controls.next).toBeEnabled();

    for (let current = 1; current < pages; current += 1) {
      await controls.next.click();
      await expect(controls.indicator).toHaveText(`${String(current + 1)} / ${String(pages)}`);
    }
    await expect(controls.next).toBeDisabled();
    await expect(controls.previous).toBeEnabled();
    await expect(quotes.rows()).toHaveCount(TOTAL - pageSize * (pages - 1));

    await controls.previous.click();
    await expect(controls.indicator).toHaveText(`${String(pages - 1)} / ${String(pages)}`);
  });

  test('pages the list and reaches every quote once', async ({ page }) => {
    await bootPagedPage(page, VIEWPORT, seedBulkQuotes);
    const quotes = new QuotesPage(page);
    await quotes.goto();
    const pageSize = await settledPageSize(quotes.rows(), quotes.pagination(), TOTAL);
    expect(pageSize).toBeLessThan(TOTAL);

    const numbers = await collectQuoteNumbers(quotes);
    expect(numbers).toHaveLength(TOTAL);
    expect(new Set(numbers).size).toBe(TOTAL);
  });

  test('fits the page into the viewport without scrolling the list area', async ({ page }) => {
    await bootPagedPage(page, VIEWPORT, seedBulkQuotes);
    const quotes = new QuotesPage(page);
    await quotes.goto();
    await settledPageSize(quotes.rows(), quotes.pagination(), TOTAL);

    await expect.poll(() => scrollOverflowPx(page)).toBeLessThanOrEqual(1);
    await expect(quotes.pagination().next).toBeInViewport();
  });

  test('grows and shrinks the page with the viewport height', async ({ page }) => {
    await bootPagedPage(page, VIEWPORT, seedBulkQuotes);
    const quotes = new QuotesPage(page);
    await quotes.goto();
    const pageSize = await settledPageSize(quotes.rows(), quotes.pagination(), TOTAL);

    await page.setViewportSize({ width: VIEWPORT.width, height: 600 });
    await expect.poll(() => quotes.rows().count()).toBeLessThan(pageSize);

    await page.setViewportSize({ width: VIEWPORT.width, height: 1200 });
    await expect.poll(() => quotes.rows().count()).toBeGreaterThan(pageSize);
  });

  test('filters by status and searches on the server, starting over on page 1', async ({ page }) => {
    await bootPagedPage(page, VIEWPORT, seedBulkQuotes);
    const quotes = new QuotesPage(page);
    await quotes.goto();
    await settledPageSize(quotes.rows(), quotes.pagination(), TOTAL);
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
