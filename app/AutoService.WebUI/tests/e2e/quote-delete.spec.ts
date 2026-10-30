/** Quote deletion paths the status spec leaves out: from the editor footer, a cancelled confirmation, a
 * Sent quote without a delete action, and a delete the server answers with not found. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { fulfillJson } from './support/api-mock-response';
import { signInWithMocks } from './support/sign-in';
import { errorToastMessage, toastMessage } from './support/toast';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const DELETE_REQUEST = /\/api\/quotes\/\d+$/;

test.describe('Quotes - deleting', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('the editor footer deletes a draft after a confirmation that names it, and closes the editor', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);

    await page.getByTestId('quote-delete-draft-button').click();
    const confirmDialog = page.getByRole('dialog', { name: 'Confirm quote deletion' });
    await expect(confirmDialog).toContainText(`Delete quote ${DRAFT_NUMBER} (Timing belt replacement)?`);
    await expect(confirmDialog).toContainText('The quote and all of its lines are removed permanently.');
    await confirmDialog.getByTestId('quote-delete-confirm-button').click();

    await expect(toastMessage(page, 'Quote deleted successfully.')).toBeVisible();
    await expect(page.getByTestId('quote-totals')).toHaveCount(0);
    await expect(quotesPage.rows()).toHaveCount(2);
    await expect(quotesPage.row(DRAFT_NUMBER)).toHaveCount(0);
  });

  test('cancelling the confirmation sends no delete and keeps the quote', async ({ page }) => {
    await signInWithMocks(page);
    const deletes: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'DELETE' && DELETE_REQUEST.test(new URL(request.url()).pathname)) {
        deletes.push(request.url());
      }
    });
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await quotesPage.rowAction(DRAFT_NUMBER, 'quote-delete-button').click();
    const confirmDialog = page.getByRole('dialog', { name: 'Confirm quote deletion' });
    await confirmDialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(confirmDialog).toHaveCount(0);
    await expect(quotesPage.rows()).toHaveCount(3);
    expect(deletes).toHaveLength(0);
  });

  test('a sent quote offers no delete in its editor either', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote('ARSM-2026-0002');

    await expect(page.getByTestId('quote-delete-draft-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-download-pdf-button')).toBeVisible();
  });

  test('a quote that is already gone toasts the not-found message', async ({ page }) => {
    await signInWithMocks(page);
    await page.route((url) => DELETE_REQUEST.test(url.pathname), async (route) => {
      if (route.request().method() !== 'DELETE') {
        await route.fallback();
        return;
      }

      await fulfillJson(route, { detail: 'Quote not found.' }, 404);
    });
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await quotesPage.rowAction(DRAFT_NUMBER, 'quote-delete-button').click();
    await page.getByRole('dialog', { name: 'Confirm quote deletion' }).getByTestId('quote-delete-confirm-button').click();

    await expect(errorToastMessage(page, 'The quote was not found.')).toBeVisible();
  });
});
