/** Admin customer deletion: the confirmation names the customer, Cancel keeps it, a stale delete fails
 * visibly, and removing the only row of the last page steps the list back one page. */
import { expect, test } from '@playwright/test';
import { CustomersPage } from './pages/customers.page';
import { recordGetRequests } from './support/request-log';
import { MOCK_CUSTOMER_IDS } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

test.use({ viewport: { width: 1280, height: 1100 } });

test.describe('Delete customer', () => {
  test('names the customer, keeps it on Cancel and removes it on confirm', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page, { isAdmin: true });
    const dialog = await customersPage.openDeleteCustomer(MOCK_CUSTOMER_IDS.nora);

    await expect(dialog).toContainText('Delete Farkas Nora? Related vehicles and appointments will also be removed.');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.nora)).toBeVisible();

    const confirmDialog = await customersPage.openDeleteCustomer(MOCK_CUSTOMER_IDS.nora);
    const request = page.waitForRequest((candidate) => candidate.method() === 'DELETE' && new URL(candidate.url()).pathname === `/api/customers/${String(MOCK_CUSTOMER_IDS.nora)}`);
    await confirmDialog.getByRole('button', { name: 'Delete customer' }).click();
    await request;

    await expect(toastMessage(page, 'Customer deleted successfully.')).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.nora)).toHaveCount(0);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna)).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.bela)).toBeVisible();
    await expect(confirmDialog).toHaveCount(0);
  });

  test('deletes a customer who owns vehicles', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page, { isAdmin: true });
    const dialog = await customersPage.openDeleteCustomer(MOCK_CUSTOMER_IDS.bela);

    await expect(dialog).toContainText('Delete Toth Bela?');
    await dialog.getByRole('button', { name: 'Delete customer' }).click();

    await expect(toastMessage(page, 'Customer deleted successfully.')).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.bela)).toHaveCount(0);
  });

  test('keeps the dialog open and toasts a failure when the customer is already gone', async ({ page }) => {
    const { customersPage, state } = await CustomersPage.open(page, { isAdmin: true });
    const dialog = await customersPage.openDeleteCustomer(MOCK_CUSTOMER_IDS.nora);
    state.customers.splice(state.customers.findIndex((customer) => customer.id === MOCK_CUSTOMER_IDS.nora), 1);

    await dialog.getByRole('button', { name: 'Delete customer' }).click();

    await expect(errorToastMessage(page, 'Failed to delete customer.')).toBeVisible();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('steps back a page when the deleted customer was alone on the last page', async ({ page }) => {
    const customerRequests = recordGetRequests(page, '/api/customers');
    const { customersPage, state } = await CustomersPage.open(page, { isAdmin: true });
    await expect.poll(() => customerRequests.length).toBeGreaterThan(0);
    const pageSize = Number(customerRequests.at(-1)?.searchParams.get('pageSize'));

    // "A00toth" ... sort before "Toth", so Bela Toth is alone on page 2 of the "toth" search.
    for (let index = 0; index < pageSize; index += 1) {
      state.customers.push({
        id: 300 + index,
        firstName: 'Seed',
        middleName: null,
        lastName: `A${String(index).padStart(2, '0')}toth`,
        email: `seed.toth${String(index)}@example.test`,
        phoneNumber: null,
        vehicleCount: 0,
        vehicleLicensePlates: [],
      });
    }
    await customersPage.searchInput().fill('toth');
    const { next, indicator } = customersPage.pagination();
    await expect(indicator).toHaveText('1 / 2');
    await next.click();
    await expect(indicator).toHaveText('2 / 2');
    await expect(page.getByTestId(/^customer-card-/)).toHaveCount(1);

    const dialog = await customersPage.openDeleteCustomer(MOCK_CUSTOMER_IDS.bela);
    await dialog.getByRole('button', { name: 'Delete customer' }).click();

    await expect(toastMessage(page, 'Customer deleted successfully.')).toBeVisible();
    await expect(indicator).toHaveText('1 / 1');
    await expect(page.getByTestId(/^customer-card-/)).toHaveCount(pageSize);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.bela)).toHaveCount(0);
  });
});
