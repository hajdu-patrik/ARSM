/** Quote writes that meet another user's change: a stale version on the header, a line, a status change and
 * a list delete (409, conflict toast, reload, the next try goes through), and an appointment that locked the quote. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { changeQuoteElsewhere, closeAppointmentElsewhere } from './support/api-mock-quote-elsewhere';
import { signInWithMocks } from './support/sign-in';
import { MOCK_QUOTE_IDS } from './support/test-data';
import { buildAppointment, linkQuotes } from './support/test-data.quotes.appointments';
import { errorToastMessage, toastMessage } from './support/toast';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const SENT_NUMBER = 'ARSM-2026-0002';
const CONFLICT_MESSAGE = 'Someone else changed this quote in the meantime. The latest version has been reloaded, please try again.';

test.describe('Quotes - concurrent changes', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('a stale header save reloads the quote and the second save goes through', async ({ page }) => {
    const state = await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    const title = dialog.getByTestId('quote-title-input');

    await title.fill('My edit');
    changeQuoteElsewhere(state, MOCK_QUOTE_IDS.draftTimingBelt, { title: 'Renamed elsewhere' });
    await page.getByTestId('quote-save-header-button').click();

    await expect(errorToastMessage(page, CONFLICT_MESSAGE)).toBeVisible();
    // The reloaded copy replaces the unsaved edit, so the next save carries the current version.
    await expect(title).toHaveValue('Renamed elsewhere');
    await title.fill('My edit');
    await page.getByTestId('quote-save-header-button').click();

    await expect(toastMessage(page, 'Quote updated successfully.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: `${DRAFT_NUMBER} - My edit` })).toBeVisible();
  });

  test('a stale line save keeps the typed line, reloads the quote and saves it on the second try', async ({ page }) => {
    const state = await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    const editor = await quotesPage.startAddLine();

    await editor.getByTestId('quote-line-description-input').fill('Washer');
    await editor.getByTestId('quote-line-net-price-input').fill('10');
    changeQuoteElsewhere(state, MOCK_QUOTE_IDS.draftTimingBelt, { notes: 'Edited elsewhere' });
    await editor.getByTestId('quote-line-save-button').click();

    await expect(errorToastMessage(page, CONFLICT_MESSAGE)).toBeVisible();
    await expect(dialog.getByTestId('quote-notes-input')).toHaveValue('Edited elsewhere');
    await expect(editor.getByTestId('quote-line-description-input')).toHaveValue('Washer');
    await expect(quotesPage.lineRows()).toHaveCount(1);

    await editor.getByTestId('quote-line-save-button').click();
    await expect(toastMessage(page, 'Line added successfully.')).toBeVisible();
    await expect(quotesPage.lineRows()).toHaveCount(2);
  });

  test('a stale status change leaves the quote sent, and the second try accepts it', async ({ page }) => {
    const state = await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(SENT_NUMBER);

    changeQuoteElsewhere(state, MOCK_QUOTE_IDS.sentDiagnostics, { notes: 'Edited elsewhere' });
    await page.getByTestId('quote-accept-button').click();

    await expect(errorToastMessage(page, CONFLICT_MESSAGE)).toBeVisible();
    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Sent');

    await page.getByTestId('quote-accept-button').click();
    await expect(toastMessage(page, 'Quote marked as accepted.')).toBeVisible();
    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Accepted');
  });

  test('a stale list delete keeps the quote, and a fresh delete from the reloaded list removes it', async ({ page }) => {
    const state = await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const confirmDialog = page.getByRole('dialog', { name: 'Confirm quote deletion' });

    await quotesPage.rowAction(DRAFT_NUMBER, 'quote-delete-button').click();
    changeQuoteElsewhere(state, MOCK_QUOTE_IDS.draftTimingBelt, { title: 'Renamed elsewhere' });
    await confirmDialog.getByTestId('quote-delete-confirm-button').click();

    await expect(errorToastMessage(page, CONFLICT_MESSAGE)).toBeVisible();
    // The renamed title proves the list was reloaded with the current version.
    await expect(quotesPage.row(DRAFT_NUMBER)).toContainText('Renamed elsewhere');
    // Whether this dialog stays open is not specified; a dialog opened after the reload must delete.
    await page.keyboard.press('Escape');
    await expect(confirmDialog).toHaveCount(0);

    await quotesPage.rowAction(DRAFT_NUMBER, 'quote-delete-button').click();
    await confirmDialog.getByTestId('quote-delete-confirm-button').click();

    await expect(toastMessage(page, 'Quote deleted successfully.')).toBeVisible();
    await expect(quotesPage.row(DRAFT_NUMBER)).toHaveCount(0);
  });

  test('an appointment cancelled meanwhile locks the open quote on the next write', async ({ page }) => {
    const state = await signInWithMocks(page);
    linkQuotes(state, buildAppointment(state, 6301, 'InProgress', 'Job in progress'), [MOCK_QUOTE_IDS.draftTimingBelt]);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    const title = dialog.getByTestId('quote-title-input');
    await expect(title).toBeEnabled();

    closeAppointmentElsewhere(state, 6301, 'Cancelled');
    await title.fill('Changed after the cancel');
    await page.getByTestId('quote-save-header-button').click();

    await expect(errorToastMessage(page, 'The linked appointment was cancelled, so its quotes can no longer be changed.')).toBeVisible();
    await expect(page.getByTestId('quote-header-locked-notice')).toContainText('linked appointment was cancelled');
    await expect(title).toBeDisabled();
    await expect(page.getByTestId('quote-add-line-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-save-header-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-download-pdf-button')).toBeVisible();
    await expect(page.getByTestId('quote-delete-draft-button')).toBeVisible();
  });

  test('an appointment completed meanwhile locks the open quote and removes its delete', async ({ page }) => {
    const state = await signInWithMocks(page);
    linkQuotes(state, buildAppointment(state, 6302, 'InProgress', 'Job in progress'), [MOCK_QUOTE_IDS.draftTimingBelt]);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    closeAppointmentElsewhere(state, 6302, 'Completed');
    await dialog.getByTestId('quote-title-input').fill('Changed after the completion');
    await page.getByTestId('quote-save-header-button').click();

    await expect(errorToastMessage(page, 'The linked appointment is completed, so its quotes can no longer be changed.')).toBeVisible();
    await expect(page.getByTestId('quote-header-locked-notice')).toContainText('linked appointment is completed');
    await expect(page.getByTestId('quote-delete-draft-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-download-pdf-button')).toBeVisible();
  });

  test('a sibling quote accepted meanwhile locks the open draft but leaves it deletable', async ({ page }) => {
    const state = await signInWithMocks(page);
    linkQuotes(
      state,
      buildAppointment(state, 6303, 'InProgress', 'Job in progress'),
      [MOCK_QUOTE_IDS.draftTimingBelt, MOCK_QUOTE_IDS.sentDiagnostics],
    );
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    changeQuoteElsewhere(state, MOCK_QUOTE_IDS.sentDiagnostics, { status: 'Accepted' });
    await dialog.getByTestId('quote-title-input').fill('Changed after the sibling was accepted');
    await page.getByTestId('quote-save-header-button').click();

    await expect(errorToastMessage(page, 'A quote of the linked appointment has been accepted, so its other quotes can no longer be changed.')).toBeVisible();
    await expect(page.getByTestId('quote-header-locked-notice')).toContainText('Another quote of the linked appointment has been accepted');
    await expect(page.getByTestId('quote-delete-draft-button')).toBeVisible();
  });
});
