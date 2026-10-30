/** Quote line form rules: the inline errors of a refused save, a line the server refuses, the open-form
 * gate of the add button and the 200 line cap. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { fulfillJson } from './support/api-mock-response';
import { signInWithMocks } from './support/sign-in';
import { MOCK_QUOTE_IDS } from './support/test-data';
import { errorToastMessage } from './support/toast';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const LINE_REQUEST = /\/api\/quotes\/\d+\/lines$/;
const LINE_FIELDS_REQUIRED = 'Pick a catalogue item, or fill in the description and the net price.';
const INVALID_QUANTITY = 'The quantity must be greater than 0 and at most 10,000.';
const LINE_CAP = 200;

test.describe('Quotes - line form rules', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('a refused save sends nothing, shows each field error inline and clears them as the fields are fixed', async ({ page }) => {
    await signInWithMocks(page);
    const lineRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && LINE_REQUEST.test(request.url())) {
        lineRequests.push(request.url());
      }
    });
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);
    const editor = await quotesPage.startAddLine();
    const quantity = editor.getByTestId('quote-line-quantity-input');

    // No error shows before the first save attempt.
    await expect(quantity).not.toHaveAttribute('aria-invalid', 'true');
    await quantity.fill('0');
    await editor.getByTestId('quote-line-save-button').click();

    await expect(errorToastMessage(page, INVALID_QUANTITY)).toBeVisible();
    await expect(quantity).toHaveAttribute('aria-invalid', 'true');
    await expect(quantity).toHaveAccessibleDescription(INVALID_QUANTITY);
    await expect(editor.getByText(LINE_FIELDS_REQUIRED)).toHaveCount(2);
    await expect(editor.getByTestId('quote-line-description-input')).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.getByTestId('quote-line-net-price-input')).toHaveAttribute('aria-invalid', 'true');
    expect(lineRequests).toHaveLength(0);

    await quantity.fill('1');
    await expect(quantity).not.toHaveAttribute('aria-invalid', 'true');
    await editor.getByTestId('quote-line-description-input').fill('Washer');
    await editor.getByTestId('quote-line-net-price-input').fill('10');
    await expect(editor.getByText(LINE_FIELDS_REQUIRED)).toHaveCount(0);

    await editor.getByTestId('quote-line-save-button').click();
    await expect(quotesPage.lineRows()).toHaveCount(2);
    expect(lineRequests).toHaveLength(1);
  });

  test('a line the server refuses keeps the form open with what was typed', async ({ page }) => {
    await signInWithMocks(page);
    await page.route(LINE_REQUEST, (route) => fulfillJson(route, { detail: 'Description must be at most 120 characters.' }, 422));
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);
    const editor = await quotesPage.startAddLine();

    await editor.getByTestId('quote-line-description-input').fill('Long text');
    await editor.getByTestId('quote-line-net-price-input').fill('100');
    await editor.getByTestId('quote-line-save-button').click();

    await expect(errorToastMessage(page, 'The line description must be at most 120 characters.')).toBeVisible();
    await expect(editor.getByTestId('quote-line-description-input')).toHaveValue('Long text');
    await expect(quotesPage.lineRows()).toHaveCount(1);
  });

  test('an open add form blocks a second one until it is cancelled', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);
    const addButton = page.getByTestId('quote-add-line-button');

    const editor = await quotesPage.startAddLine();
    await expect(addButton).toBeDisabled();

    await editor.getByRole('button', { name: 'Cancel' }).click();
    await expect(editor).toHaveCount(0);
    await expect(addButton).toBeEnabled();
  });

  test('a quote at the line cap offers no further line and says why', async ({ page }) => {
    const state = await signInWithMocks(page);
    const quote = state.quotes.find((candidate) => candidate.id === MOCK_QUOTE_IDS.draftTimingBelt);
    const template = quote?.lines[0];
    if (quote === undefined || template === undefined) {
      throw new Error('The fixture draft quote is missing.');
    }
    quote.lines = Array.from({ length: LINE_CAP }, (_, index) => ({ ...template, id: 9000 + index, sortOrder: index + 1 }));
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);

    await expect(page.getByText(`Lines: ${String(LINE_CAP)} / ${String(LINE_CAP)}`)).toBeVisible();
    const addButton = page.getByTestId('quote-add-line-button');
    await expect(addButton).toBeDisabled();
    await expect(addButton).toHaveAttribute('title', 'A quote can contain at most 200 lines.');
  });
});
