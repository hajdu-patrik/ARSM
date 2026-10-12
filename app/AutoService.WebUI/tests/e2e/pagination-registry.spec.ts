/** Customers list paging: page size follows the viewport, arrows and indicator, server-side search,
 * ascending order without any sort parameter, and the vehicles of an expanded card five at a time. */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CustomersPage } from './pages/customers.page';
import { installApiMocks } from './support/api-mocks';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { MOCK_CUSTOMER_IDS, type MockApiState } from './support/test-data';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SEEDED_CUSTOMER_COUNT = 26;
const FIRST_SEEDED_CUSTOMER_ID = 200;
const SEEDED_VEHICLE_COUNT = 10;
const FIRST_SEEDED_VEHICLE_ID = 2000;
const VEHICLES_PER_PAGE = 5;
const SHORT_VIEWPORT = { width: 1280, height: 640 };
const TALL_VIEWPORT = { width: 1280, height: 1100 };

/** Adds customers named "Seed AlfaA" ... "Seed AlfaZ"; they sort before the three fixture customers. */
function seedCustomers(state: MockApiState): void {
  for (let index = 0; index < SEEDED_CUSTOMER_COUNT; index += 1) {
    const letter = ALPHABET.charAt(index);
    state.customers.push({
      id: FIRST_SEEDED_CUSTOMER_ID + index,
      firstName: 'Seed',
      middleName: null,
      lastName: `Alfa${letter}`,
      email: `seed.alfa${letter.toLowerCase()}@example.test`,
      phoneNumber: null,
      vehicleCount: 0,
      vehicleLicensePlates: [],
    });
  }
}

/** Adds ten Audi vehicles (plates AUD-001 ...) to Anna, so she has twelve in all: pages of 5, 5 and 2. */
function seedAnnaVehicles(state: MockApiState): void {
  const vehicles = state.vehiclesByCustomerId[MOCK_CUSTOMER_IDS.anna];
  const template = vehicles?.[0];

  if (vehicles === undefined || template === undefined) {
    throw new Error('The mock state has no vehicles for Anna.');
  }

  for (let index = 0; index < SEEDED_VEHICLE_COUNT; index += 1) {
    vehicles.push({
      ...template,
      id: FIRST_SEEDED_VEHICLE_ID + index,
      licensePlate: `AUD-${String(index + 1).padStart(3, '0')}`,
      brand: 'Audi',
      model: `Model${ALPHABET.charAt(index)}`,
    });
  }
}

/** The customer ids in the order the list shows them: by last name, then first name. */
function expectedCustomerOrder(): number[] {
  const seeded = Array.from({ length: SEEDED_CUSTOMER_COUNT }, (_, index) => FIRST_SEEDED_CUSTOMER_ID + index);

  return [...seeded, MOCK_CUSTOMER_IDS.nora, MOCK_CUSTOMER_IDS.anna, MOCK_CUSTOMER_IDS.bela];
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

function readPageSize(url: URL | undefined): number {
  return Number(url?.searchParams.get('pageSize') ?? Number.NaN);
}

/** Waits until the shown cards are exactly the page size the last request asked for; returns it. */
async function settledPageSize(page: Page, urls: readonly URL[]): Promise<number> {
  const cards = page.getByTestId(/^customer-card-/);
  let size = 0;
  await expect.poll(async () => {
    size = readPageSize(urls.at(-1));
    return size === await cards.count();
  }).toBe(true);

  return size;
}

test.describe('Customers list paging', () => {
  let customerRequests: URL[] = [];
  let customersPage: CustomersPage;

  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
    seedCustomers(state);
    seedAnnaVehicles(state);
    customerRequests = recordGetRequests(page, '/api/customers');
    await new AuthPage(page).loginAsMechanic(env);
    await page.setViewportSize(TALL_VIEWPORT);
    customersPage = new CustomersPage(page);
    await customersPage.goto();
  });

  test('the page size follows the viewport height and is the pageSize sent to the server', async ({ page }) => {
    const tallSize = await settledPageSize(page, customerRequests);
    await expect(customersPage.pagination().indicator).toHaveText(`1 / ${String(Math.ceil(29 / tallSize))}`);

    await page.setViewportSize(SHORT_VIEWPORT);
    await expect.poll(() => readPageSize(customerRequests.at(-1))).toBeLessThan(tallSize);
    const shortSize = await settledPageSize(page, customerRequests);

    expect(shortSize).toBeGreaterThanOrEqual(1);
    await expect(customersPage.pagination().indicator).toHaveText(`1 / ${String(Math.ceil(29 / shortSize))}`);
  });

  test('the arrows page through the customers in ascending order and stop at both ends', async ({ page }) => {
    const size = await settledPageSize(page, customerRequests);
    const totalPages = Math.ceil(29 / size);
    const order = expectedCustomerOrder();
    const { previous, next, indicator } = customersPage.pagination();

    await expect(indicator).toHaveText(`1 / ${String(totalPages)}`);
    await expect(previous).toBeDisabled();
    await expect(customersPage.customerCard(order[0] ?? 0)).toBeVisible();

    await next.click();
    await expect(indicator).toHaveText(`2 / ${String(totalPages)}`);
    await expect(customersPage.customerCard(order[size] ?? 0)).toBeVisible();
    await expect(customersPage.customerCard(order[0] ?? 0)).toHaveCount(0);
    expect(customerRequests.at(-1)?.searchParams.get('page')).toBe('2');

    for (let current = 2; current < totalPages; current += 1) {
      await next.click();
      await expect(indicator).toHaveText(`${String(current + 1)} / ${String(totalPages)}`);
    }

    await expect(next).toBeDisabled();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.bela)).toBeVisible();

    await previous.click();
    await expect(indicator).toHaveText(`${String(totalPages - 1)} / ${String(totalPages)}`);
    await expect(next).toBeEnabled();
  });

  test('the search is sent to the server, starts again at page 1 and no sort parameter is sent', async ({ page }) => {
    await settledPageSize(page, customerRequests);
    await customersPage.pagination().next.click();
    await expect(customersPage.pagination().indicator).toHaveText(/^2 \//);

    await customersPage.searchInput().fill('alfac');

    await expect(customersPage.customerCard(FIRST_SEEDED_CUSTOMER_ID + 2)).toBeVisible();
    await expect(page.getByTestId(/^customer-card-/)).toHaveCount(1);
    await expect(customersPage.pagination().indicator).toHaveText('1 / 1');
    const searchRequest = customerRequests.find((url) => url.searchParams.get('search') === 'alfac');
    expect(searchRequest?.searchParams.get('page')).toBe('1');
    expect(customerRequests.some((url) => url.searchParams.has('sortDirection'))).toBe(false);

    await customersPage.searchInput().fill('');
    await expect(customersPage.pagination().indicator).toHaveText(/^1 \/ [2-9]/);
  });

  test('the vehicles of an expanded customer come five at a time', async ({ page }) => {
    const vehicleRequests = recordGetRequests(page, `/api/customers/${String(MOCK_CUSTOMER_IDS.anna)}/vehicles`);
    await customersPage.searchInput().fill('Kovacs');
    await expect(page.getByTestId(/^customer-card-/)).toHaveCount(1);
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    const card = customersPage.customerCard(MOCK_CUSTOMER_IDS.anna);
    const { previous, next, indicator } = customersPage.vehiclePagination(MOCK_CUSTOMER_IDS.anna);
    const vehicleRows = card.getByTestId('vehicle-create-quote-button');

    await expect(indicator).toHaveText('1 / 3');
    await expect(vehicleRows).toHaveCount(VEHICLES_PER_PAGE);
    await expect(card.getByText('AUD-001', { exact: true })).toBeVisible();
    await expect(previous).toBeDisabled();
    expect(vehicleRequests.some((url) => readPageSize(url) === VEHICLES_PER_PAGE)).toBe(true);

    // The compact arrows stay a 44px touch target.
    const nextBox = await next.boundingBox();
    expect(nextBox?.width).toBeGreaterThanOrEqual(44);
    expect(nextBox?.height).toBeGreaterThanOrEqual(44);

    await next.click();
    await expect(indicator).toHaveText('2 / 3');
    await expect(card.getByText('AUD-006', { exact: true })).toBeVisible();
    await expect(card.getByText('AUD-001', { exact: true })).toHaveCount(0);

    await next.click();
    await expect(indicator).toHaveText('3 / 3');
    await expect(vehicleRows).toHaveCount(2);
    await expect(card.getByText('NXE-441', { exact: true })).toBeVisible();
    await expect(next).toBeDisabled();

    await previous.click();
    await expect(indicator).toHaveText('2 / 3');
  });
});
