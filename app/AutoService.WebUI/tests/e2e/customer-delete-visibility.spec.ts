/** Only an admin may delete a customer or a vehicle (the API answers 403 to a mechanic), so only an admin is
 * offered the two delete actions; editing stays open to every mechanic. */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CustomersPage } from './pages/customers.page';
import { installApiMocks } from './support/api-mocks';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { MOCK_CUSTOMER_IDS } from './support/test-data';

// Tall enough that the page-size-by-height list shows all three fixture customers on page 1.
test.use({ viewport: { width: 1280, height: 1000 } });

/** Signs in with or without admin rights and expands Anna's card, which shows her two vehicles. */
async function openAnna(page: Page, isAdmin: boolean): Promise<CustomersPage> {
  const env = getAppointmentFlowEnv();
  await installApiMocks(page, { profileEmail: env.mechanicEmail, isAdmin });
  await new AuthPage(page).loginAsMechanic(env);

  const customersPage = new CustomersPage(page);
  await customersPage.goto();
  await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

  return customersPage;
}

test.describe('Customer and vehicle delete actions', () => {
  test('an admin is offered the delete action of every customer and vehicle', async ({ page }) => {
    const customersPage = await openAnna(page, true);

    await expect(page.getByRole('button', { name: 'Delete customer' })).toHaveCount(3);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna).getByRole('button', { name: 'Delete vehicle' })).toHaveCount(2);
  });

  test('a mechanic without admin rights sees edit actions only', async ({ page }) => {
    const customersPage = await openAnna(page, false);

    await expect(page.getByRole('button', { name: 'Edit customer' })).toHaveCount(3);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna).getByRole('button', { name: 'Edit vehicle' })).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Delete customer' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete vehicle' })).toHaveCount(0);
  });
});
