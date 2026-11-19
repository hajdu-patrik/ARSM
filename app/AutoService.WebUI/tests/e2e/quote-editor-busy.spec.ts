/** The quote editor while it loads or writes: a load title and a Close-only footer, the dialog that stays
 * open during a write, and one busy flag that locks the header, the lines and the footer together. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { signInWithMocks } from './support/sign-in';
import { MOCK_QUOTE_IDS } from './support/test-data';
import { toastMessage } from './support/toast';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const DRAFT_TITLE = 'Timing belt replacement';
const DRAFT_PATH = `/api/quotes/${String(MOCK_QUOTE_IDS.draftTimingBelt)}`;
const LOCKED_BY_BUSY = [
  'quote-title-input',
  'quote-notes-input',
  'quote-valid-until-input',
  'quote-save-validity-button',
  'quote-add-line-button',
  'quote-save-header-button',
  'quote-send-button',
  'quote-delete-draft-button',
];
const ABSENT_WHILE_LOADING = [
  'quote-create-button',
  'quote-save-header-button',
  'quote-send-button',
  'quote-download-pdf-button',
  'quote-delete-draft-button',
];

/** Holds the matching request until the returned function is called, then lets the default mock answer it. */
async function holdRequest(page: Page, method: string, pathname: string): Promise<() => void> {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route((url) => url.pathname === pathname, async (route) => {
    if (route.request().method() !== method) {
      await route.fallback();
      return;
    }

    await released;
    await route.fallback();
  });

  return release;
}

/** Expects every control of the open draft that a write could race with to be disabled. */
async function expectEditorLocked(quotesPage: QuotesPage, dialog: Locator): Promise<void> {
  for (const testId of LOCKED_BY_BUSY) {
    await expect(dialog.getByTestId(testId)).toBeDisabled();
  }

  await expect(quotesPage.lineAction(0, 'quote-line-edit-button')).toBeDisabled();
  await expect(quotesPage.lineAction(0, 'quote-line-delete-button')).toBeDisabled();
  await expect(quotesPage.closeEditorButton()).toBeDisabled();
}

test.describe('Quotes - editor loading and busy state', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('while the quote loads the dialog is titled for the load and its footer offers only Close', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    const releaseRead = await holdRequest(page, 'GET', DRAFT_PATH);

    await page.goto(`/quotes?quoteId=${String(MOCK_QUOTE_IDS.draftTimingBelt)}`);

    const loading = page.getByRole('dialog', { name: 'Loading quote...' });
    await expect(loading).toBeVisible();
    await expect(loading.getByRole('status')).toHaveText('Loading quote...');
    await expect(quotesPage.closeEditorButton()).toBeEnabled();
    // The dialog chrome has its own close button, so Close plus that one are all the buttons there are.
    await expect(loading.getByRole('button')).toHaveCount(2);
    for (const testId of ABSENT_WHILE_LOADING) {
      await expect(loading.getByTestId(testId)).toHaveCount(0);
    }

    releaseRead();

    await expect(page.getByRole('dialog', { name: `${DRAFT_NUMBER} - ${DRAFT_TITLE}` })).toBeVisible();
    await expect(page.getByTestId('quote-save-header-button')).toBeVisible();
  });

  test('the dialog stays open while a save is pending, whichever way it is dismissed', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    const releaseSave = await holdRequest(page, 'PUT', DRAFT_PATH);

    await dialog.getByTestId('quote-title-input').fill('Pending edit');
    await dialog.getByTestId('quote-save-header-button').click();
    await expect(dialog.getByTestId('quote-save-header-button')).toHaveAttribute('aria-busy', 'true');
    await page.keyboard.press('Escape');
    await dialog.getByRole('button', { name: 'Close dialog' }).click({ timeout: 2_000 });
    releaseSave();

    // A dialog dismissed meanwhile would be gone here, with the save done behind its back.
    await expect(toastMessage(page, 'Quote updated successfully.')).toBeVisible();
    const saved = page.getByRole('dialog', { name: `${DRAFT_NUMBER} - Pending edit` });
    await expect(saved).toBeVisible();

    await quotesPage.closeEditorButton().click();
    await expect(saved).toHaveCount(0);
  });

  test('a pending header save locks the header, the lines and the footer', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    const releaseSave = await holdRequest(page, 'PUT', DRAFT_PATH);

    await dialog.getByTestId('quote-title-input').fill('Edited while saving');
    await dialog.getByTestId('quote-save-header-button').click();
    await expect(dialog.getByTestId('quote-save-header-button')).toHaveAttribute('aria-busy', 'true');
    await expectEditorLocked(quotesPage, dialog);

    releaseSave();

    await expect(toastMessage(page, 'Quote updated successfully.')).toBeVisible();
    await expect(dialog.getByTestId('quote-title-input')).toBeEnabled();
  });

  test('a pending line save locks the header, the lines and the footer', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    const releaseSave = await holdRequest(page, 'POST', `${DRAFT_PATH}/lines`);

    // An unsaved title keeps the header save otherwise enabled, so only the busy flag can lock it.
    await dialog.getByTestId('quote-title-input').fill('Edited while a line saves');
    const editor = await quotesPage.startAddLine();
    await editor.getByTestId('quote-line-description-input').fill('Washer');
    await editor.getByTestId('quote-line-net-price-input').fill('10');
    await editor.getByTestId('quote-line-save-button').click();
    await expect(editor.getByTestId('quote-line-save-button')).toHaveAttribute('aria-busy', 'true');
    await expectEditorLocked(quotesPage, dialog);

    releaseSave();

    await expect(toastMessage(page, 'Line added successfully.')).toBeVisible();
    await expect(dialog.getByTestId('quote-title-input')).toBeEnabled();
  });

  test('a pending status change locks the header, the lines and the footer', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    const releaseSend = await holdRequest(page, 'POST', `${DRAFT_PATH}/status`);

    await dialog.getByTestId('quote-title-input').fill('Edited while sending');
    await dialog.getByTestId('quote-send-button').click();
    await expect(dialog.getByTestId('quote-send-button')).toHaveAttribute('aria-busy', 'true');
    await expectEditorLocked(quotesPage, dialog);

    releaseSend();

    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Sent');
  });
});
