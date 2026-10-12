/** Every paged list sends exactly one list request on page entry, sized to the rows it then shows,
 * and never sends an empty `search=` parameter. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CatalogPage } from './pages/catalog.page';
import { CustomersPage } from './pages/customers.page';
import { QuotesPage } from './pages/quotes.page';
import { installApiMocks } from './support/api-mocks';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { MOCK_QUOTE_IDS, type MockApiState } from './support/test-data';

const VIEWPORT = { width: 1280, height: 900 };
const SEEDED_COUNT = 30;
const ANIMATION_FRAMES_TO_WAIT = 3;
const SETTLE_DELAY_MS = 400;
const EMPTY_SEARCH_PARAM = /[?&]search=(?:&|$)/;

const pad = (index: number): string => String(index).padStart(3, '0');
const SEEDED = Array.from({ length: SEEDED_COUNT }, (_, index) => index + 1);

/** One paged list: where its request goes, how the page opens, and which rows and search box it has. */
interface ListCase {
  readonly name: string;
  readonly pathname: string;
  readonly searchTerm: string;
  readonly seed: (state: MockApiState) => void;
  readonly open: (page: Page) => Promise<void>;
  readonly rows: (page: Page) => Locator;
  readonly searchInput: (page: Page) => Locator;
}

/** Thirty extra customers, more than one page, so the page size is what limits the shown cards. */
function seedCustomers(state: MockApiState): void {
  for (const index of SEEDED) {
    state.customers.push({
      id: 200 + index,
      firstName: 'Seed',
      middleName: null,
      lastName: `Alfa${pad(index)}`,
      email: `seed.alfa${String(index)}@example.test`,
      phoneNumber: null,
      vehicleCount: 0,
      vehicleLicensePlates: [],
    });
  }
}

function seedParts(state: MockApiState): void {
  state.parts.push(...SEEDED.map((index) => (
    { id: 5000 + index, partNumber: `PRT-${pad(index)}`, name: `Seed part ${pad(index)}`, netUnitPrice: 1000, vatRatePercent: 27, grossUnitPrice: 1270 }
  )));
}

function seedLaborTypes(state: MockApiState): void {
  state.laborTypes.push(...SEEDED.map((index) => (
    { id: 6000 + index, code: `LAB-${pad(index)}`, name: `Seed labour ${pad(index)}`, hourlyNetRate: 5000, vatRatePercent: 27, grossHourlyRate: 6350 }
  )));
}

/** Thirty extra quotes copied from the sent fixture quote. */
function seedQuotes(state: MockApiState): void {
  const template = state.quotes.find((quote) => quote.id === MOCK_QUOTE_IDS.sentDiagnostics);
  if (!template) {
    throw new Error('The quote fixtures changed: the bulk seed needs the sent quote.');
  }

  for (const index of SEEDED) {
    state.quotes.push({
      ...template,
      id: 8000 + index,
      quoteNumber: `ARSM-2026-03${String(index).padStart(2, '0')}`,
      title: `Bulk quote ${pad(index)}`,
      createdAt: new Date(Date.UTC(2026, 5, index)).toISOString(),
      lines: [],
    });
  }
}

const LIST_CASES: readonly ListCase[] = [
  {
    name: 'customers',
    pathname: '/api/customers',
    searchTerm: 'alfa',
    seed: seedCustomers,
    open: (page) => new CustomersPage(page).goto(),
    rows: (page) => page.getByTestId(/^customer-card-/),
    searchInput: (page) => new CustomersPage(page).searchInput(),
  },
  {
    name: 'inventory parts',
    pathname: '/api/parts',
    searchTerm: 'PRT',
    seed: seedParts,
    open: (page) => new CatalogPage(page).goto('parts'),
    rows: (page) => page.getByTestId('catalog-item-row'),
    searchInput: (page) => new CatalogPage(page).searchInput('part'),
  },
  {
    name: 'inventory labor types',
    pathname: '/api/labor-types',
    searchTerm: 'LAB',
    seed: seedLaborTypes,
    open: (page) => new CatalogPage(page).goto('labor-types'),
    rows: (page) => page.getByTestId('catalog-item-row'),
    searchInput: (page) => new CatalogPage(page).searchInput('laborType'),
  },
  {
    name: 'quotes',
    pathname: '/api/quotes',
    searchTerm: 'Bulk',
    seed: seedQuotes,
    open: (page) => new QuotesPage(page).goto(),
    rows: (page) => new QuotesPage(page).rows(),
    searchInput: (page) => new QuotesPage(page).searchInput(),
  },
];

/** Mocks the API, seeds the list and signs in; the viewport is fixed so the page size is stable. */
async function bootPage(page: Page, seed: (state: MockApiState) => void): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  seed(state);
  await new AuthPage(page).loginAsMechanic(env);
}

/** Records the URL of every GET to the path, so a test can read the query the page sent. */
function recordGetRequests(page: Page, pathname: string): URL[] {
  const urls: URL[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === pathname) {
      urls.push(url);
    }
  });

  return urls;
}

/** Lets the frame-scheduled re-measure and a late debounced fetch happen, so an extra request is seen. */
async function letPageSettle(page: Page): Promise<void> {
  await page.evaluate(async ({ frames, delayMs }) => {
    for (let frame = 0; frame < frames; frame += 1) {
      await new Promise((resolve) => { requestAnimationFrame(resolve); });
    }
    await new Promise((resolve) => { setTimeout(resolve, delayMs); });
  }, { frames: ANIMATION_FRAMES_TO_WAIT, delayMs: SETTLE_DELAY_MS });
}

function hasEmptySearchParam(urls: readonly URL[]): boolean {
  return urls.some((url) => EMPTY_SEARCH_PARAM.test(url.search));
}

for (const listCase of LIST_CASES) {
  test.describe(`Single list request - ${listCase.name}`, () => {
    test('entering the page sends exactly one request, sized to the shown rows, without a search parameter', async ({ page }) => {
      await bootPage(page, listCase.seed);
      const urls = recordGetRequests(page, listCase.pathname);

      await listCase.open(page);
      const rows = listCase.rows(page);
      await expect(rows.first()).toBeVisible();
      await letPageSettle(page);

      expect(urls, 'the list was requested more than once on page entry').toHaveLength(1);
      const [entry] = urls;
      expect(entry?.searchParams.get('page')).toBe('1');
      expect(entry?.searchParams.has('search')).toBe(false);
      await expect(rows).toHaveCount(Number(entry?.searchParams.get('pageSize')));
    });

    test('a search and clearing it never send an empty search parameter', async ({ page }) => {
      await bootPage(page, listCase.seed);
      const urls = recordGetRequests(page, listCase.pathname);

      await listCase.open(page);
      const rows = listCase.rows(page);
      await expect(rows.first()).toBeVisible();
      const initialRowCount = await rows.count();
      const search = listCase.searchInput(page);

      await search.fill(listCase.searchTerm);
      await expect.poll(() => urls.some((url) => url.searchParams.get('search') === listCase.searchTerm)).toBe(true);

      // The unsearched first page is still cached, so clearing may send no request; the list must be back either way.
      await search.fill('');
      await expect(rows).toHaveCount(initialRowCount);
      await letPageSettle(page);

      expect(hasEmptySearchParam(urls), 'a request carried an empty search parameter').toBe(false);
    });
  });
}
