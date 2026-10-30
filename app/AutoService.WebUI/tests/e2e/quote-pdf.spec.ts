/** Quote PDF download: from the list row and from the editor footer in every status, and the failure toast. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { fulfillJson } from './support/api-mock-response';
import { signInWithMocks } from './support/sign-in';
import { errorToastMessage } from './support/toast';

/** Draft, sent and expired fixtures: every status is printable. */
const QUOTE_NUMBERS = ['ARSM-2026-0001', 'ARSM-2026-0002', 'ARSM-2026-0003'] as const;

test.describe('Quotes - PDF download', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('the list row downloads the PDF named after its quote', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      quotesPage.rowAction('ARSM-2026-0002', 'quote-download-button').click(),
    ]);

    expect(download.suggestedFilename()).toBe('ARSM-2026-0002.pdf');
  });

  for (const quoteNumber of QUOTE_NUMBERS) {
    test(`the editor of ${quoteNumber} downloads its PDF`, async ({ page }) => {
      await signInWithMocks(page);
      const quotesPage = new QuotesPage(page);
      await quotesPage.goto();
      await quotesPage.openQuote(quoteNumber);

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByTestId('quote-download-pdf-button').click(),
      ]);

      expect(download.suggestedFilename()).toBe(`${quoteNumber}.pdf`);
    });
  }

  test('a PDF that cannot be produced toasts and leaves the quote open', async ({ page }) => {
    await signInWithMocks(page);
    await page.route((url) => /\/api\/quotes\/\d+\/pdf$/.test(url.pathname), (route) => fulfillJson(route, { detail: 'Not available.' }, 404));
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote('ARSM-2026-0001');

    await page.getByTestId('quote-download-pdf-button').click();

    await expect(errorToastMessage(page, 'Failed to download the quote PDF.')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('quote-download-pdf-button')).toBeEnabled();
  });
});
