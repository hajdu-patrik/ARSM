/** The Quotes list shows the validity date as the UTC day, like the editor, the PDF and the e-mail, also in a
 * zone east of UTC where 23:59:59 UTC is already the next local day. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { signInWithMocks } from './support/sign-in';
import { MOCK_QUOTE_IDS } from './support/test-data';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const SENT_NUMBER = 'ARSM-2026-0002';

test.describe('Quotes - validity date in a zone east of UTC', () => {
  test.use({ timezoneId: 'Europe/Budapest', viewport: { width: 1280, height: 1200 } });

  test('the list row and the editor show the same day for a deadline at the end of the UTC day', async ({ page }) => {
    const state = await signInWithMocks(page);
    const draft = state.quotes.find((candidate) => candidate.id === MOCK_QUOTE_IDS.draftTimingBelt);
    if (draft === undefined) {
      throw new Error('The fixture draft quote is missing.');
    }
    draft.validUntil = '2026-12-04T23:59:59.000Z';
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    // Budapest is UTC+1 in December: the instant is 00:59:59 on the 5th there, but the day is the 4th.
    await expect(quotesPage.row(DRAFT_NUMBER)).toContainText('04/12/2026');
    await expect(quotesPage.row(DRAFT_NUMBER)).not.toContainText('05/12/2026');
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    await expect(dialog.getByTestId('quote-valid-until-input')).toHaveValue('2026-12-04');
  });

  test('the fixture deadline of 31 December does not roll over into the new year', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await expect(quotesPage.row(SENT_NUMBER)).toContainText('31/12/2099');
    await expect(quotesPage.row(SENT_NUMBER)).not.toContainText('01/01/2100');
  });
});
