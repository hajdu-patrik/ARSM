/** Quote validity: the separate save of a draft, the extend-only rule of a sent quote, reviving an expired
 * one, the send refusal of a draft whose date passed, and the closed (accepted or rejected) quote. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { signInWithMocks } from './support/sign-in';
import { MOCK_QUOTE_IDS, type MockApiState } from './support/test-data';
import type { TestLanguage } from './support/browser-state';
import { errorToastMessage, toastMessage } from './support/toast';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const SENT_NUMBER = 'ARSM-2026-0002';
const EXPIRED_NUMBER = 'ARSM-2026-0003';

test.describe('Quotes - validity', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('a draft saves its validity on its own, without the header save', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    await dialog.getByTestId('quote-valid-until-input').fill('2100-03-15');
    await expect(page.getByTestId('quote-save-header-button')).toBeDisabled();
    await dialog.getByTestId('quote-save-validity-button').click();

    await expect(toastMessage(page, 'Validity date saved successfully.')).toBeVisible();
    await expect(dialog.getByTestId('quote-valid-until-input')).toHaveValue('2100-03-15');
    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.row(DRAFT_NUMBER)).toContainText('15/03/2100');
  });

  test('a date in the past is refused and the deadline stays', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    await dialog.getByTestId('quote-valid-until-input').fill('2020-01-01');
    await dialog.getByTestId('quote-save-validity-button').click();

    await expect(errorToastMessage(page, 'The validity date cannot be in the past.')).toBeVisible();
    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.row(DRAFT_NUMBER)).toContainText('31/12/2099');
  });

  test('a sent quote explains the rule, refuses an earlier date and accepts a later one', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(SENT_NUMBER);
    const validUntil = dialog.getByTestId('quote-valid-until-input');
    const saveValidity = dialog.getByTestId('quote-save-validity-button');

    await expect(dialog.getByText('A sent quote only accepts a later validity date.')).toBeVisible();
    await validUntil.fill('2099-06-01');
    await saveValidity.click();
    await expect(errorToastMessage(page, 'A sent quote can only be extended to a later date.')).toBeVisible();

    await validUntil.fill('2100-01-15');
    await saveValidity.click();
    await expect(toastMessage(page, 'Validity date saved successfully.')).toBeVisible();

    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.row(SENT_NUMBER)).toContainText('15/01/2100');
    await expect(quotesPage.statusBadge(SENT_NUMBER)).toHaveText('Sent');
  });

  test('extending an expired quote makes it a live sent quote again', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await expect(quotesPage.statusBadge(EXPIRED_NUMBER)).toHaveText('Expired');
    const dialog = await quotesPage.openQuote(EXPIRED_NUMBER);
    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Expired');

    const later = new Date();
    later.setUTCDate(later.getUTCDate() + 60);
    await dialog.getByTestId('quote-valid-until-input').fill(later.toISOString().slice(0, 10));
    await dialog.getByTestId('quote-save-validity-button').click();

    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Sent');
    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.statusBadge(EXPIRED_NUMBER)).toHaveText('Sent');
  });
});

/** The reason text of a passed validity date, in both languages (`quotes.errors.validUntilInPast`). */
const VALIDITY_PASSED_TEXT: Record<TestLanguage, string> = {
  en: 'The validity date cannot be in the past.',
  hu: 'Az érvényességi dátum nem lehet múltbeli.',
};
const PASSED_VALID_UNTIL = '2020-01-01T23:59:59.000Z';

/** The fixture draft quote, whose validity the test can move behind the server's back. */
function draftOf(state: MockApiState) {
  const quote = state.quotes.find((candidate) => candidate.id === MOCK_QUOTE_IDS.draftTimingBelt);
  if (quote === undefined) {
    throw new Error('The fixture draft quote is missing.');
  }

  return quote;
}

test.describe('Quotes - draft whose validity passed', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  for (const language of ['en', 'hu'] as const) {
    test(`${language}: Send is disabled with the validity text as its reason, and a later date enables it`, async ({ page }) => {
      const state = await signInWithMocks(page, {}, language);
      draftOf(state).validUntil = PASSED_VALID_UNTIL;
      const quotesPage = new QuotesPage(page);
      await quotesPage.goto();
      const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
      const send = page.getByTestId('quote-send-button');

      await expect(send).toBeDisabled();
      await expect(send).toHaveAttribute('title', VALIDITY_PASSED_TEXT[language]);

      await dialog.getByTestId('quote-valid-until-input').fill('2100-03-15');
      await dialog.getByTestId('quote-save-validity-button').click();
      await expect(send).toBeEnabled();
      await expect(send).not.toHaveAttribute('title', VALIDITY_PASSED_TEXT[language]);
    });

    test(`${language}: a 422 quote_valid_until_passed toasts the validity text and keeps the draft`, async ({ page }) => {
      const state = await signInWithMocks(page, {}, language);
      const quotesPage = new QuotesPage(page);
      await quotesPage.goto();
      const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
      // The date lapses on the server while the editor is open, so the button was still enabled.
      draftOf(state).validUntil = PASSED_VALID_UNTIL;

      await page.getByTestId('quote-send-button').click();

      await expect(errorToastMessage(page, VALIDITY_PASSED_TEXT[language])).toBeVisible();
      await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText(language === 'en' ? 'Draft' : 'Piszkozat');
      await expect(quotesPage.customerEmailDialog()).toHaveCount(0);
    });
  }
});

test.describe('Quotes - closed quotes', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  for (const status of ['Accepted', 'Rejected'] as const) {
    test(`a ${status.toLowerCase()} quote is read-only, with the validity locked and no line actions`, async ({ page }) => {
      const state = await signInWithMocks(page);
      const quote = state.quotes.find((candidate) => candidate.id === MOCK_QUOTE_IDS.sentDiagnostics);
      if (quote === undefined) {
        throw new Error('The fixture sent quote is missing.');
      }
      quote.status = status;
      const quotesPage = new QuotesPage(page);
      await quotesPage.goto();
      const dialog = await quotesPage.openQuote(SENT_NUMBER);

      await expect(page.getByTestId('quote-header-locked-notice')).toContainText(`has been ${status.toLowerCase()}, so it is closed`);
      await expect(dialog.getByTestId('quote-title-input')).toBeDisabled();
      await expect(dialog.getByTestId('quote-notes-input')).toBeDisabled();
      await expect(dialog.getByTestId('quote-valid-until-input')).toBeDisabled();
      await expect(dialog.getByTestId('quote-save-validity-button')).toBeDisabled();
      await expect(page.getByTestId('quote-add-line-button')).toHaveCount(0);
      await expect(quotesPage.lineRows()).toHaveCount(1);
      await expect(quotesPage.lineAction(0, 'quote-line-edit-button')).toHaveCount(0);
      await expect(quotesPage.lineAction(0, 'quote-line-delete-button')).toHaveCount(0);
      await expect(page.getByTestId('quote-send-button')).toHaveCount(0);
      await expect(page.getByTestId('quote-accept-button')).toHaveCount(0);
      await expect(page.getByTestId('quote-reject-button')).toHaveCount(0);
      await expect(page.getByTestId('quote-delete-draft-button')).toHaveCount(0);
      await expect(page.getByTestId('quote-download-pdf-button')).toBeVisible();
    });
  }
});
