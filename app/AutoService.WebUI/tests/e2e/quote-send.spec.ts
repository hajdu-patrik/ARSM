/** Outcomes of the status buttons: the send email toast, a send the mail step refuses, and the accept and reject toasts. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { fulfillJson } from './support/api-mock-response';
import { signInWithMocks } from './support/sign-in';
import { errorToastMessage, toastMessage } from './support/toast';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const SENT_NUMBER = 'ARSM-2026-0002';

/** The 409 the API answers a send with when the mail step fails, and its toast; a missing address is a 422 with a dialog instead. */
const EMAIL_FAILED = {
  code: 'quote_email_failed',
  message: 'The quote was not sent: the e-mail to the customer could not be delivered, the status is unchanged.',
} as const;

test.describe('Quotes - sending and deciding', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('sending a draft toasts the e-mail and moves the quote from the Draft chip to the Sent chip', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    await page.getByTestId('quote-send-button').click();

    await expect(toastMessage(page, /e-mailed to the customer/)).toBeVisible();
    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Sent');
    await quotesPage.closeEditorButton().click();

    await quotesPage.filterByStatus('Draft');
    await expect(page.getByTestId('quotes-empty')).toBeVisible();
    await quotesPage.filterByStatus('Sent');
    await expect(quotesPage.rows()).toHaveCount(2);
    await expect(quotesPage.statusBadge(DRAFT_NUMBER)).toHaveText('Sent');
  });

  test(`a send refused with ${EMAIL_FAILED.code} keeps the quote a draft and editable`, async ({ page }) => {
    await signInWithMocks(page);
    await page.route(
      (url) => /\/api\/quotes\/\d+\/status$/.test(url.pathname),
      (route) => fulfillJson(route, { code: EMAIL_FAILED.code }, 409),
    );
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    await page.getByTestId('quote-send-button').click();

    await expect(errorToastMessage(page, EMAIL_FAILED.message)).toBeVisible();
    await expect(quotesPage.customerEmailDialog()).toHaveCount(0);
    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Draft');
    await expect(page.getByTestId('quote-send-button')).toBeEnabled();
    await expect(dialog.getByTestId('quote-title-input')).toBeEnabled();
    await expect(page.getByTestId('quote-header-locked-notice')).toHaveCount(0);
  });

  test('a send answered 422 quote_customer_email_missing opens the e-mail dialog instead of a toast', async ({ page }) => {
    await signInWithMocks(page);
    await page.route(
      (url) => /\/api\/quotes\/\d+\/status$/.test(url.pathname),
      (route) => fulfillJson(route, { code: 'quote_customer_email_missing' }, 422),
    );
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    await page.getByTestId('quote-send-button').click();

    await expect(quotesPage.customerEmailDialog()).toBeVisible();
    await expect(errorToastMessage(page, /customer has no e-mail address/)).toHaveCount(0);
    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Draft');
  });

  test('accepting toasts the decision and rejecting toasts it too', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await quotesPage.openQuote(SENT_NUMBER);
    await page.getByTestId('quote-accept-button').click();
    await expect(toastMessage(page, 'Quote marked as accepted.')).toBeVisible();
    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.statusBadge(SENT_NUMBER)).toHaveText('Accepted');

    // A second sent quote to reject: the draft goes out first.
    await quotesPage.openQuote(DRAFT_NUMBER);
    await page.getByTestId('quote-send-button').click();
    await expect(page.getByTestId('quote-reject-button')).toBeVisible();
    await page.getByTestId('quote-reject-button').click();
    await expect(toastMessage(page, 'Quote marked as rejected.')).toBeVisible();
    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.statusBadge(DRAFT_NUMBER)).toHaveText('Rejected');
  });
});
