/** Quote inputs at their edges: a refused delete closes its confirmation, a validity date the browser cannot
 * turn into a deadline is refused before any request, and the line preview rounds half a cent up. */
import { expect, test, type Locator } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { fulfillJson } from './support/api-mock-response';
import { selectDropdownOption } from './support/dropdown';
import { signInWithMocks } from './support/sign-in';
import { MOCK_VEHICLE_IDS } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const DELETE_REQUEST = /^\/api\/quotes\/\d+$/;
const CREATE_REQUEST = /\/api\/vehicles\/\d+\/quotes$/;
const VALIDITY_REQUEST = /\/api\/quotes\/\d+\/valid-until$/;
const VALIDITY_IN_PAST = 'The validity date cannot be in the past.';
/** The last day a date input accepts: the end of that day is past the largest instant a Date can hold. */
const UNREPRESENTABLE_DATE = '275760-09-13';

/** Sets the raw value of a date input and fires the input event React listens to; `fill` refuses a six-digit year. */
async function setRawDateValue(input: Locator, value: string): Promise<void> {
  await input.evaluate((element, next) => {
    const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    valueDescriptor?.set?.call(element, next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await expect(input).toHaveValue(value);
}

test.describe('Quotes - input edges', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('a refused delete closes its confirmation, and a new one deletes the quote', async ({ page }) => {
    await signInWithMocks(page);
    let isRefusing = true;
    await page.route((url) => DELETE_REQUEST.test(url.pathname), async (route) => {
      if (route.request().method() !== 'DELETE' || !isRefusing) {
        await route.fallback();
        return;
      }

      isRefusing = false;
      await fulfillJson(route, {}, 400);
    });
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const confirmDialog = page.getByRole('dialog', { name: 'Confirm quote deletion' });

    await quotesPage.rowAction(DRAFT_NUMBER, 'quote-delete-button').click();
    await confirmDialog.getByTestId('quote-delete-confirm-button').click();

    await expect(errorToastMessage(page, 'Failed to delete the quote.')).toBeVisible();
    // The confirmation holds the version it opened at, so it must not stay open for a second click.
    await expect(confirmDialog).toHaveCount(0);
    await expect(quotesPage.row(DRAFT_NUMBER)).toBeVisible();

    await quotesPage.rowAction(DRAFT_NUMBER, 'quote-delete-button').click();
    await confirmDialog.getByTestId('quote-delete-confirm-button').click();

    await expect(toastMessage(page, 'Quote deleted successfully.')).toBeVisible();
    await expect(quotesPage.row(DRAFT_NUMBER)).toHaveCount(0);
  });

  test('a new draft with an unusable validity date sends nothing and says the date is refused', async ({ page }) => {
    await signInWithMocks(page);
    const createRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && CREATE_REQUEST.test(request.url())) {
        createRequests.push(request.url());
      }
    });
    const quotesPage = new QuotesPage(page);
    const dialog = await quotesPage.gotoNewQuote(MOCK_VEHICLE_IDS.annaNxe441);

    await dialog.getByTestId('quote-title-input').fill('Far future estimate');
    await setRawDateValue(dialog.getByTestId('quote-valid-until-input'), UNREPRESENTABLE_DATE);
    await dialog.getByTestId('quote-create-button').click();

    await expect(errorToastMessage(page, VALIDITY_IN_PAST)).toBeVisible();
    await expect(dialog.getByTestId('quote-create-button')).toBeVisible();
    expect(createRequests).toHaveLength(0);
  });

  test('saving an unusable validity date sends nothing and says the date is refused', async ({ page }) => {
    await signInWithMocks(page);
    const validityRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PUT' && VALIDITY_REQUEST.test(request.url())) {
        validityRequests.push(request.url());
      }
    });
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    await setRawDateValue(dialog.getByTestId('quote-valid-until-input'), UNREPRESENTABLE_DATE);
    await dialog.getByTestId('quote-save-validity-button').click();

    await expect(errorToastMessage(page, VALIDITY_IN_PAST)).toBeVisible();
    expect(validityRequests).toHaveLength(0);
  });

  test('the line preview rounds half a cent up like the server, so the forint amounts match', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);
    const editor = await quotesPage.startAddLine();
    await editor.getByTestId('quote-line-description-input').fill('Preview rounding');
    await editor.getByTestId('quote-line-quantity-input').fill('1');

    // 4.30 at 5% is 4.52 gross.
    await editor.getByTestId('quote-line-net-price-input').fill('4.30');
    await selectDropdownOption(page, 'quote-line-vat-select', '5');
    await expect(editor.getByTestId('quote-line-preview')).toHaveText(/HUF\s4 net \/ HUF\s5 gross/);

    // 190.25 at 18% has 34.245 VAT, which the server rounds to 34.25, so the gross is 224.50 and shows as 225.
    await editor.getByTestId('quote-line-net-price-input').fill('190.25');
    await selectDropdownOption(page, 'quote-line-vat-select', '18');
    await expect(editor.getByTestId('quote-line-preview')).toHaveText(/HUF\s190 net \/ HUF\s225 gross/);
  });
});
