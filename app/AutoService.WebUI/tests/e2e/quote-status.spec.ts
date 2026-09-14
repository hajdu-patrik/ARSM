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

test.describe('Quotes - status flow', () => {
  test('keeps send disabled while the draft has no line, and enables it once one exists', async ({ page }) => {
    await prepareQuotesPage(page);
    const customersPage = new CustomersPage(page);
    const quotesPage = new QuotesPage(page);

    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);
    const dialog = await quotesPage.startQuoteFromVehicle(MOCK_CUSTOMER_IDS.anna);

    await dialog.getByTestId('quote-title-input').fill('Suspension check');
    await dialog.getByTestId('quote-create-button').click();

    const sendButton = page.getByTestId('quote-send-button');
    await expect(sendButton).toBeDisabled();
    // The button also says why it is disabled (D21).
    await expect(sendButton).toHaveAttribute('title', 'Add at least one line before sending the quote.');

    await quotesPage.addLine({
      kind: 'part',
      description: 'Custom bushing set',
      quantity: '1',
      netUnitPrice: '15000',
    });

    await expect(sendButton).toBeEnabled();
  });

  test('sends a draft and locks the header, leaving only the validity extendable', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote('ARSM-2026-0001');

    await page.getByTestId('quote-send-button').click();

    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Sent');
    await expect(page.getByTestId('quote-header-locked-notice')).toBeVisible();
    await expect(page.getByTestId('quote-title-input')).toBeDisabled();
    await expect(page.getByTestId('quote-notes-input')).toBeDisabled();
    await expect(page.getByTestId('quote-add-line-button')).toHaveCount(0);

    // The one exception: the deadline can still be pushed out (D23).
    await expect(page.getByTestId('quote-valid-until-input')).toBeEnabled();
    await expect(page.getByTestId('quote-save-validity-button')).toBeEnabled();
  });

  test('offers accept and reject on a sent quote, and only close once it is decided', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote('ARSM-2026-0002');

    await expect(page.getByTestId('quote-accept-button')).toBeVisible();
    await expect(page.getByTestId('quote-reject-button')).toBeVisible();
    await expect(page.getByTestId('quote-send-button')).toHaveCount(0);

    await page.getByTestId('quote-accept-button').click();

    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Accepted');
    await expect(page.getByTestId('quote-accept-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-reject-button')).toHaveCount(0);
    await expect(quotesPage.closeEditorButton()).toBeVisible();
  });

  test('rejects a sent quote and shows the rejected badge in the list', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote('ARSM-2026-0002');

    await page.getByTestId('quote-reject-button').click();
    await quotesPage.closeEditorButton().click();

    await expect(quotesPage.statusBadge('ARSM-2026-0002')).toHaveText('Rejected');
  });

  test('filters by status, with expired answering for the sent quote past its deadline', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    // The expired fixture is stored as Sent; only the computed flag separates it.
    await expect(quotesPage.statusBadge('ARSM-2026-0003')).toHaveText('Expired');

    await quotesPage.filterByStatus('Draft');
    await expect(quotesPage.rows()).toHaveCount(1);
    await expect(quotesPage.rows().first()).toContainText('ARSM-2026-0001');

    await quotesPage.filterByStatus('Sent');
    await expect(quotesPage.rows()).toHaveCount(1);
    await expect(quotesPage.rows().first()).toContainText('ARSM-2026-0002');

    await quotesPage.filterByStatus('Expired');
    await expect(quotesPage.rows()).toHaveCount(1);
    await expect(quotesPage.rows().first()).toContainText('ARSM-2026-0003');

    await quotesPage.filterByStatus('All');
    await expect(quotesPage.rows()).toHaveCount(3);
  });

  test('deletes a draft quote through the confirmation modal', async ({ page }) => {
    await prepareQuotesPage(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await quotesPage.rowAction('ARSM-2026-0001', 'quote-delete-button').click();
    const confirmDialog = page.getByRole('dialog', { name: 'Confirm quote deletion' });
    await expect(confirmDialog).toContainText('ARSM-2026-0001');

    await confirmDialog.getByTestId('quote-delete-confirm-button').click();

    await expect(quotesPage.rows()).toHaveCount(2);
    await expect(quotesPage.row('ARSM-2026-0001')).toHaveCount(0);
  });
});
