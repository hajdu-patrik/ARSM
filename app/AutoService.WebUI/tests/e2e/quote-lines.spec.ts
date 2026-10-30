/** Quote line editing beyond the editor spec: a free-form line with its VAT rate and live preview, the
 * catalog prefill and its override, the kind switch, editing a saved line and deleting it. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { expectDropdownLabel, readDropdownOptionValues, selectDropdownOption } from './support/dropdown';
import { signInWithMocks } from './support/sign-in';
import { MOCK_LABOR_TYPE_IDS, MOCK_PART_IDS } from './support/test-data';
import { toastMessage } from './support/toast';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const LINE_REQUEST = /\/api\/quotes\/\d+\/lines(?:\/\d+)?$/;

test.describe('Quotes - lines', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('a free-form line previews its amounts, lands with the chosen VAT rate and moves the totals', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);
    await expect(page.getByText('Lines: 1 / 200')).toBeVisible();

    const editor = await quotesPage.startAddLine();
    await editor.getByTestId('quote-line-description-input').fill('Custom bushing set');
    await editor.getByTestId('quote-line-quantity-input').fill('2');
    await editor.getByTestId('quote-line-net-price-input').fill('1500');
    await selectDropdownOption(page, 'quote-line-vat-select', '18');
    await expectDropdownLabel(editor.getByTestId('quote-line-vat-select'), '18%');
    await expect(editor.getByTestId('quote-line-preview')).toContainText(/3,000 net \/ .*3,540 gross/);
    await editor.getByTestId('quote-line-save-button').click();

    await expect(toastMessage(page, 'Line added successfully.')).toBeVisible();
    await expect(quotesPage.lineRows()).toHaveCount(2);
    const row = quotesPage.lineRows().nth(1);
    await expect(row).toContainText('Custom bushing set');
    await expect(row.locator('[data-column="quantity"]')).toContainText('2');
    await expect(row.locator('[data-column="unitPrice"]')).toContainText('1,500.00');
    await expect(row.locator('[data-column="vat"]')).toContainText('18%');
    await expect(row.locator('[data-column="gross"]')).toContainText('3,540');
    // 12,000 + 3,000 net, 3,240 + 540 VAT.
    await expect(quotesPage.totalNet()).toContainText('15,000');
    await expect(quotesPage.totalVat()).toContainText('3,780');
    await expect(quotesPage.totalGross()).toContainText('18,780');
    await expect(page.getByText('Lines: 2 / 200')).toBeVisible();
  });

  test('a catalog part prefills the form and a typed price still overrides the catalog price', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);

    const editor = await quotesPage.startAddLine();
    await selectDropdownOption(page, 'quote-line-catalog-select', String(MOCK_PART_IDS.brakePad));
    await expect(editor.getByTestId('quote-line-description-input')).toHaveValue('Brake pad set');
    await expect(editor.getByTestId('quote-line-net-price-input')).toHaveValue('8000');
    await expectDropdownLabel(editor.getByTestId('quote-line-vat-select'), '27%');

    await editor.getByTestId('quote-line-net-price-input').fill('9000');
    const lineRequest = page.waitForRequest((request) => request.method() === 'POST' && LINE_REQUEST.test(request.url()));
    await editor.getByTestId('quote-line-save-button').click();

    expect((await lineRequest).postDataJSON()).toMatchObject({ lineKind: 'Part', partId: MOCK_PART_IDS.brakePad, netUnitPrice: 9000, quantity: 1 });
    await expect(quotesPage.lineRows()).toHaveCount(2);
    // 12,000 + 9,000 net: the typed price won, not the 8,000 of the catalog.
    await expect(quotesPage.totalNet()).toContainText('21,000');
    await expect(quotesPage.totalGross()).toContainText('26,670');
  });

  test('the kind decides which catalog is offered and resets a picked item', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);
    const editor = await quotesPage.startAddLine();
    const catalog = editor.getByTestId('quote-line-catalog-select');

    expect(await readDropdownOptionValues(page, 'quote-line-catalog-select')).toEqual(['', String(MOCK_PART_IDS.timingBelt), String(MOCK_PART_IDS.brakePad)]);
    await selectDropdownOption(page, 'quote-line-catalog-select', String(MOCK_PART_IDS.timingBelt));
    await expectDropdownLabel(catalog, 'ALT-1001 - Timing belt');

    await editor.getByTestId('quote-line-kind-labor').click();
    await expectDropdownLabel(catalog, 'Custom item');
    expect(await readDropdownOptionValues(page, 'quote-line-catalog-select')).toEqual(['', String(MOCK_LABOR_TYPE_IDS.diagnostics), String(MOCK_LABOR_TYPE_IDS.oilChange)]);
  });

  test('editing a line starts from its stored values, a cancel changes nothing and a save follows the server', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);

    await quotesPage.lineAction(0, 'quote-line-edit-button').click();
    const editor = page.getByTestId('quote-line-editor');
    await expect(editor.getByTestId('quote-line-description-input')).toHaveValue('Timing belt');
    await expect(editor.getByTestId('quote-line-quantity-input')).toHaveValue('1');
    await expect(editor.getByTestId('quote-line-net-price-input')).toHaveValue('12000');
    await expectDropdownLabel(editor.getByTestId('quote-line-vat-select'), '27%');
    await expectDropdownLabel(editor.getByTestId('quote-line-catalog-select'), 'ALT-1001 - Timing belt');

    await editor.getByTestId('quote-line-quantity-input').fill('5');
    await editor.getByRole('button', { name: 'Cancel' }).click();
    await expect(editor).toHaveCount(0);
    await expect(quotesPage.lineRows().first().locator('[data-column="quantity"]')).toContainText('1');
    await expect(quotesPage.totalGross()).toContainText('15,240');

    await quotesPage.lineAction(0, 'quote-line-edit-button').click();
    await selectDropdownOption(page, 'quote-line-vat-select', '18');
    await editor.getByTestId('quote-line-save-button').click();

    await expect(toastMessage(page, 'Line updated successfully.')).toBeVisible();
    await expect(quotesPage.lineRows().first().locator('[data-column="vat"]')).toContainText('18%');
    await expect(quotesPage.totalVat()).toContainText('2,160');
    await expect(quotesPage.totalGross()).toContainText('14,160');
  });

  test('deleting the last line toasts and shows the empty lines state', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);

    await quotesPage.lineAction(0, 'quote-line-delete-button').click();

    await expect(toastMessage(page, 'Line deleted successfully.')).toBeVisible();
    await expect(page.getByTestId('quote-lines-empty')).toHaveText('This quote has no lines yet.');
    await expect(page.getByText('Lines: 0 / 200')).toBeVisible();
  });
});
