import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CustomersPage } from './pages/customers.page';
import { QuotesPage } from './pages/quotes.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import { MOCK_CUSTOMER_IDS, type MockApiState } from './support/test-data';

/** Installs the quote mock and logs in as a mechanic; returns the mutable mock state. */
async function prepareQuotesPage(page: Page): Promise<MockApiState> {
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  await new AuthPage(page).loginAsMechanic(env);
  return state;
}

test.describe('Quotes - list and editor', () => {
  test('lists quotes with the vehicle, the status and the server-calculated totals', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await expect(quotesPage.rows()).toHaveCount(3);

    const draftRow = quotesPage.row('ARSM-2026-0001');
    await expect(draftRow).toContainText('Timing belt replacement');
    await expect(draftRow).toContainText('NXE-441');
    await expect(quotesPage.statusBadge('ARSM-2026-0001')).toHaveText('Draft');
    // Both figures come from the list DTO: 12,000 net and 15,240 gross.
    await expect(draftRow).toContainText(/12,000/);
    await expect(draftRow).toContainText(/15,240/);
  });

  test('offers delete on every row, disabled for anything but a draft', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await expect(quotesPage.rowAction('ARSM-2026-0001', 'quote-delete-button')).toBeEnabled();

    const nonDraftDelete = quotesPage.rowAction('ARSM-2026-0002', 'quote-delete-button');
    await expect(nonDraftDelete).toBeDisabled();
    await expect(nonDraftDelete).toHaveAttribute('title', 'Only a draft can be deleted.');
  });

  test('searches by quote number, title and license plate', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await quotesPage.searchInput().fill('BRC-918');
    await expect(quotesPage.rows()).toHaveCount(1);
    await expect(quotesPage.rows().first()).toContainText('ARSM-2026-0002');

    await quotesPage.searchInput().fill('ARSM-2026-0003');
    await expect(quotesPage.rows()).toHaveCount(1);
    await expect(quotesPage.rows().first()).toContainText('Oil change offer');

    await quotesPage.searchClearButton().click();
    await expect(quotesPage.rows()).toHaveCount(3);
  });

  test('starts a draft from a vehicle row and keeps the new quote in the list', async ({ page }) => {
    await prepareQuotesPage(page);
    const customersPage = new CustomersPage(page);
    const quotesPage = new QuotesPage(page);

    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    const dialog = await quotesPage.startQuoteFromVehicle(MOCK_CUSTOMER_IDS.anna);
    // The anchored vehicle is named in the editor, so the mechanic can see
    // which car the draft belongs to before writing anything.
    await expect(dialog).toContainText('NXE-441');
    await expect(page).toHaveURL(/\/quotes$/);

    await dialog.getByTestId('quote-title-input').fill('Clutch replacement estimate');
    await dialog.getByTestId('quote-create-button').click();

    // The editor adopts the created quote, so lines can be added right away.
    await expect(page.getByTestId('quote-add-line-button')).toBeVisible();
    await expect(page.getByTestId('quote-lines-empty')).toBeVisible();

    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.rows()).toHaveCount(4);
    await expect(quotesPage.row('ARSM-2026-0004')).toContainText('Clutch replacement estimate');
  });

  test('adds a catalog part line and shows the totals the server returned', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote('ARSM-2026-0001');

    await expect(quotesPage.lineRows()).toHaveCount(1);
    await expect(quotesPage.totalGross()).toContainText(/15,240/);

    await quotesPage.addLine({ kind: 'part', catalogLabel: 'BRK-2002 - Brake pad set', quantity: '2' });

    // 12,000 + 2 x 8,000 net, 3,240 + 4,320 VAT, and gross is their sum.
    await expect(quotesPage.totalNet()).toContainText(/28,000/);
    await expect(quotesPage.totalVat()).toContainText(/7,560/);
    await expect(quotesPage.totalGross()).toContainText(/35,560/);
    await expect(quotesPage.lineRows().nth(1)).toContainText('Brake pad set');
  });

  test('labels a labor line in hours and hourly rate instead of quantity and unit price', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote('ARSM-2026-0001');

    await page.getByTestId('quote-add-line-button').click();
    const lineEditor = page.getByTestId('quote-line-editor');

    await expect(lineEditor.getByText('Quantity', { exact: true })).toBeVisible();
    await expect(lineEditor.getByText('Net unit price', { exact: true })).toBeVisible();

    await lineEditor.getByTestId('quote-line-kind-labor').click();
    await expect(lineEditor.getByText('Hours', { exact: true })).toBeVisible();
    await expect(lineEditor.getByText('Hourly rate (net)', { exact: true })).toBeVisible();
  });

  test('adds a labor line from the labor-type catalog with a fractional hour', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote('ARSM-2026-0001');

    await quotesPage.addLine({ kind: 'labor', catalogLabel: 'LBR-DIAG - Diagnostics', quantity: '1.5' });

    // 12,000 + 1.5 x 9,000 net: half hours are storable (D20).
    await expect(quotesPage.totalNet()).toContainText(/25,500/);
    await expect(quotesPage.totalGross()).toContainText(/32,385/);
  });

  test('edits a line quantity and removes a line, following the server totals both times', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote('ARSM-2026-0001');

    await quotesPage.lineAction(0, 'quote-line-edit-button').click();
    const lineEditor = page.getByTestId('quote-line-editor');
    await lineEditor.getByTestId('quote-line-quantity-input').fill('3');
    await lineEditor.getByTestId('quote-line-save-button').click();

    await expect(quotesPage.totalNet()).toContainText(/36,000/);
    await expect(quotesPage.totalGross()).toContainText(/45,720/);

    await quotesPage.lineAction(0, 'quote-line-delete-button').click();
    await expect(quotesPage.lineRows()).toHaveCount(0);
    await expect(quotesPage.totalGross()).toContainText(/0/);
  });
});
