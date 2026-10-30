/** Paging of the Inventory tabs: viewport-sized pages, arrows, indicator, server search and the tab switch.
 * The file keeps its old name; the Quotes list is paged in `quote-pagination.spec.ts`. */
import { expect, test, type Page } from '@playwright/test';
import { CatalogPage, type CatalogItemKind, type CatalogTab } from './pages/catalog.page';
import { bootPagedPage, scrollOverflowPx, settledPageSize } from './support/paging-helpers';
import type { MockApiState } from './support/test-data';

const VIEWPORT = { width: 1280, height: 900 };
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
        { id: 5000 + index, partNumber: `PRT-${pad(index)}`, name: `Seed part ${pad(index)}`, netUnitPrice: 1000, vatRatePercent: 27, grossUnitPrice: 1270, version: 1 }
      )));
    },
  },
  {
    kind: 'laborType',
    tab: 'labor-types',
    search: 'LAB-01',
    seed: (state) => {
      state.laborTypes.push(...SEEDED.map((index) => (
        { id: 6000 + index, code: `LAB-${pad(index)}`, name: `Seed labour ${pad(index)}`, hourlyNetRate: 5000, vatRatePercent: 27, grossHourlyRate: 6350, version: 1 }
      )));
    },
  },
];

async function bootPage(page: Page, seed?: (state: MockApiState) => void): Promise<void> {
  await bootPagedPage(page, VIEWPORT, seed);
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
