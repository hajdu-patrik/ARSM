/** Quotes list states the editor specs do not reach: the Accepted and Rejected chips, chip plus search,
 * the empty and failed lists, and the vehicle and quote deep links. */
import { expect, test } from '@playwright/test';
import type { QuoteStatus } from '../../src/types/quotes/quotes.types';
import { QuotesPage } from './pages/quotes.page';
import { fulfillJson } from './support/api-mock-response';
import { signInWithMocks } from './support/sign-in';
import { MOCK_QUOTE_IDS, MOCK_VEHICLE_IDS, type MockApiState } from './support/test-data';
import { errorToastMessage } from './support/toast';

/** Stores a status on a fixture quote before the page loads. */
function setStoredStatus(state: MockApiState, quoteId: number, status: QuoteStatus): void {
  const quote = state.quotes.find((candidate) => candidate.id === quoteId);
  if (quote === undefined) {
    throw new Error(`The fixture quote ${String(quoteId)} is missing.`);
  }

  quote.status = status;
}

test.describe('Quotes - list filters and states', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('the Accepted and Rejected chips list the quotes stored with that status', async ({ page }) => {
    const state = await signInWithMocks(page);
    setStoredStatus(state, MOCK_QUOTE_IDS.sentDiagnostics, 'Accepted');
    setStoredStatus(state, MOCK_QUOTE_IDS.expiredOilChange, 'Rejected');
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await quotesPage.filterByStatus('Accepted');
    await expect(quotesPage.rows()).toHaveCount(1);
    await expect(quotesPage.row('ARSM-2026-0002')).toBeVisible();
    await expect(quotesPage.statusBadge('ARSM-2026-0002')).toHaveText('Accepted');

    await quotesPage.filterByStatus('Rejected');
    await expect(quotesPage.rows()).toHaveCount(1);
    await expect(quotesPage.statusBadge('ARSM-2026-0003')).toHaveText('Rejected');

    // Nothing is left in Sent: the decided quotes left it and a rejected one is not "expired".
    await quotesPage.filterByStatus('Sent');
    await expect(page.getByTestId('quotes-empty')).toBeVisible();
  });

  test('a chip without a match shows the empty state, and a chip narrows the search', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await quotesPage.filterByStatus('Accepted');
    await expect(page.getByTestId('quotes-empty')).toHaveText('No quotes match your current filter.');
    await expect(quotesPage.rows()).toHaveCount(0);

    await quotesPage.filterByStatus('All');
    await quotesPage.searchInput().fill('no-such-quote');
    await expect(page.getByTestId('quotes-empty')).toBeVisible();
    await quotesPage.searchClearButton().click();
    await expect(quotesPage.rows()).toHaveCount(3);

    // The Sent chip leaves the expired quote out, so its title finds nothing under that chip.
    await quotesPage.filterByStatus('Sent');
    await quotesPage.searchInput().fill('Oil change');
    await expect(page.getByTestId('quotes-empty')).toBeVisible();
    await quotesPage.searchInput().fill('BRC-918');
    await expect(quotesPage.rows()).toHaveCount(1);
    await expect(quotesPage.row('ARSM-2026-0002')).toBeVisible();
  });

  test('a list that cannot be loaded toasts the failure', async ({ page }) => {
    await signInWithMocks(page);
    await page.route((url) => url.pathname === '/api/quotes', (route) => fulfillJson(route, { detail: 'Rejected.' }, 400));
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await expect(errorToastMessage(page, 'Failed to load quotes.')).toHaveCount(1);
  });

  test('the vehicle link opens the create dialog for that vehicle and is consumed', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);

    const dialog = await quotesPage.gotoNewQuote(MOCK_VEHICLE_IDS.annaNxe441);
    await expect(dialog).toContainText('NXE-441');
    await expect(page).toHaveURL(/\/quotes$/);

    await quotesPage.closeEditorButton().click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(quotesPage.rows()).toHaveCount(3);
    await expect(quotesPage.editorDialog()).toHaveCount(0);
  });

  test('a malformed vehicle id opens no dialog and still clears the link', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);

    await page.goto('/quotes?vehicleId=abc&new=1');
    await expect(quotesPage.rows()).toHaveCount(3);
    await expect(page).toHaveURL(/\/quotes$/);
    await expect(quotesPage.editorDialog()).toHaveCount(0);
  });

  test('the quote link opens that quote and an unknown quote opens nothing', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);

    await page.goto(`/quotes?quoteId=${String(MOCK_QUOTE_IDS.sentDiagnostics)}`);
    await expect(quotesPage.editorDialog().getByTestId('quote-title-input')).toHaveValue('Diagnostics and brake check');
    await expect(page).toHaveURL(/\/quotes$/);

    await quotesPage.closeEditorButton().click();
    await page.goto('/quotes?quoteId=999999');
    await expect(errorToastMessage(page, 'Failed to load the quote.')).toBeVisible();
    await expect(quotesPage.editorDialog()).toHaveCount(0);
  });

  test('a vehicle that does not exist costs the plate and the draft, not the dialog', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);

    const dialog = await quotesPage.gotoNewQuote(999999);
    await expect(dialog).toContainText('Unknown vehicle');
    await expect(errorToastMessage(page, 'Failed to load the vehicle of this quote.')).toBeVisible();

    await dialog.getByTestId('quote-title-input').fill('Ghost car');
    await dialog.getByTestId('quote-create-button').click();
    await expect(errorToastMessage(page, 'The vehicle was not found.')).toBeVisible();
    await expect(dialog.getByTestId('quote-create-button')).toBeVisible();
  });
});
