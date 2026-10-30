/** Customers list states: expanding a card, the empty and failed reads, the search field (clear, plate
 * highlight, dropped digits) and the end-of-list note. */
import { expect, test } from '@playwright/test';
import { CustomersPage } from './pages/customers.page';
import { fulfillJson } from './support/api-mock-response';
import { recordGetRequests } from './support/request-log';
import { signInWithMocks } from './support/sign-in';
import { MOCK_CUSTOMER_IDS } from './support/test-data';
import { errorToastMessage } from './support/toast';

// Tall enough that the page-size-by-height list shows all three fixture customers on page 1.
test.use({ viewport: { width: 1280, height: 1000 } });

const ANNA = MOCK_CUSTOMER_IDS.anna;
const END_OF_LIST = 'No more customers in the system';

test.describe('Customer card expansion', () => {
  test('the chevron expands and collapses the card, and expanding shows the customer history', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const expander = page.getByTestId(`customer-expand-${String(ANNA)}`);
    const card = customersPage.customerCard(ANNA);

    await expect(expander).toHaveAttribute('aria-expanded', 'false');
    await expect(expander).toHaveAccessibleName('Show customer vehicles');
    await expander.click();

    await expect(expander).toHaveAttribute('aria-expanded', 'true');
    await expect(expander).toHaveAttribute('aria-controls', /.+/);
    await expect(expander).toHaveAccessibleName('Hide customer vehicles');
    await expect(card.getByTestId('vehicle-tile')).toHaveCount(2);
    await customersPage.expectCustomerHistoryPanel();

    await expander.click();
    await expect(card).toHaveAttribute('data-expanded', 'false');
    await expect(card.getByTestId('vehicle-tile')).toHaveCount(0);
  });

  test('a click on the customer name expands the card and shows the customer history', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const card = customersPage.customerCard(ANNA);

    await card.getByRole('button', { name: 'Kovacs Anna' }).click();

    await expect(card).toHaveAttribute('data-expanded', 'true');
    await expect(card.getByTestId('vehicle-tile')).toHaveCount(2);
    await customersPage.expectCustomerHistoryPanel();
    await expect(customersPage.detailsPanel()).toContainText('Hybrid system inspection');
  });

  test('a customer without vehicles shows both empty states', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);

    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.nora);

    const card = customersPage.customerCard(MOCK_CUSTOMER_IDS.nora);
    await expect(card).toContainText('No vehicles found for this customer.');
    await expect(card.getByRole('button', { name: 'Create vehicle' })).toBeVisible();
    await expect(customersPage.detailsPanel()).toContainText('No repair history found for this customer.');
  });
});

test.describe('Customers list failed reads', () => {
  test('a failed customers read toasts once and shows neither rows nor the empty message', async ({ page }) => {
    await signInWithMocks(page);
    await page.route((url) => url.pathname === '/api/customers', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { detail: 'Customers unavailable' }, 422);
        return;
      }
      await route.fallback();
    });

    await new CustomersPage(page).goto();

    await expect(errorToastMessage(page, 'Failed to load customers.')).toBeVisible();
    await expect(page.getByTestId(/^customer-card-/)).toHaveCount(0);
    await expect(page.getByText('No customers match your current filter.')).toHaveCount(0);
    await expect(page.getByTestId('customers-pagination-indicator')).toHaveCount(0);
  });

  test('a failed vehicles read toasts and does not claim the customer has no vehicles', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    await page.route(new RegExp(`/api/customers/${String(ANNA)}/vehicles`), async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { detail: 'Vehicles unavailable' }, 422);
        return;
      }
      await route.fallback();
    });

    await customersPage.expandCustomer(ANNA);

    const card = customersPage.customerCard(ANNA);
    await expect(errorToastMessage(page, 'Failed to load customer vehicles.')).toBeVisible();
    await expect(card).not.toContainText('No vehicles found for this customer.');
    await expect(card.getByTestId('vehicle-tile')).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Create vehicle' })).toBeVisible();
  });
});

test.describe('Customers search field', () => {
  test('the clear button empties the field, restores the list and then disappears', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const clear = page.getByTestId('customers-search-clear');

    await expect(clear).toHaveCount(0);
    await customersPage.searchInput().fill('zzz');
    await expect(page.getByText('No customers match your current filter.')).toBeVisible();
    await expect(page.getByText(END_OF_LIST)).toHaveCount(0);

    await clear.click();

    await expect(customersPage.searchInput()).toHaveValue('');
    await expect(page.getByTestId(/^customer-card-/)).toHaveCount(3);
    await expect(clear).toHaveCount(0);
    await expect(page.getByText(END_OF_LIST)).toBeVisible();
  });

  test('highlights the matching part of a vehicle plate on the expanded card', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);

    await customersPage.searchInput().fill('nxe');
    await expect(page.getByTestId(/^customer-card-/)).toHaveCount(1);
    await customersPage.expandCustomer(ANNA);

    await expect(customersPage.customerCard(ANNA).locator('span.text-arsm-accent-vivid')).toHaveText('NXE');
  });

  test('drops typed digits, so a plate search sends only its letters', async ({ page }) => {
    const customerRequests = recordGetRequests(page, '/api/customers');
    const { customersPage } = await CustomersPage.open(page);

    await customersPage.searchInput().fill('NXE-441');

    await expect(customersPage.searchInput()).toHaveValue('NXE-');
    await expect.poll(() => customerRequests.some((url) => url.searchParams.get('search') === 'NXE-')).toBe(true);
    expect(customerRequests.some((url) => (url.searchParams.get('search') ?? '').includes('4'))).toBe(false);
  });

  test('keeps letters, spaces and apostrophes', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);

    await customersPage.searchInput().fill("O'Neil Ann");

    await expect(customersPage.searchInput()).toHaveValue("O'Neil Ann");
  });
});
