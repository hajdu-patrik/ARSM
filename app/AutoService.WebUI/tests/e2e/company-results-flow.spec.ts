/** Company results fed by the Quotes page: a rejection, a decision made in the same session, and a mixed
 * set of accepted quotes with two VAT rates and both line kinds. The clock is pinned to 15 October 2026. */
import { expect, test, type Page } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { openReport, pinReportClock } from './support/company-results-period';
import { selectDropdownOption } from './support/dropdown';
import { signInWithMocks } from './support/sign-in';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const SENT_NUMBER = 'ARSM-2026-0002';

/** Clicks a decision button of the open sent quote and closes the editor once the quote is decided. */
async function decide(page: Page, quotesPage: QuotesPage, button: 'quote-accept-button' | 'quote-reject-button'): Promise<void> {
  await page.getByTestId(button).click();
  await expect(page.getByTestId(button)).toHaveCount(0);
  await quotesPage.closeEditorButton().click();
}

test.describe('Company results - fed by the quotes', () => {
  test.beforeEach(async ({ page }) => {
    await pinReportClock(page);
  });

  test('a rejected quote moves its money into the rejected row only', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(SENT_NUMBER);
    await decide(page, quotesPage, 'quote-reject-button');

    await openReport(page);

    await expect(page.getByTestId('company-results-rejected')).toContainText(/22,860/);
    await expect(page.getByTestId('company-results-rejected')).toContainText(/1 quote$/);
    await expect(page.getByTestId('company-results-pending')).toContainText('HUF 0');
    await expect(page.getByTestId('company-results-pending')).toContainText(/0 quotes$/);
    await expect(page.getByTestId('company-results-accepted-gross')).toHaveText('HUF 0');
    await expect(page.getByTestId('company-results-vat-empty')).toBeVisible();
  });

  test('a decision made in the same session shows on the report without a reload', async ({ page }) => {
    await signInWithMocks(page);
    await openReport(page);
    await expect(page.getByTestId('company-results-accepted-gross')).toHaveText('HUF 0');

    await page.getByRole('link', { name: 'Quotes', exact: true }).click();
    const quotesPage = new QuotesPage(page);
    await expect(quotesPage.searchInput()).toBeVisible();
    await quotesPage.openQuote(SENT_NUMBER);
    await decide(page, quotesPage, 'quote-accept-button');

    await page.getByRole('link', { name: 'Company results', exact: true }).click();

    await expect(page.getByTestId('company-results-accepted-gross')).toHaveText(/22,860/);
    await expect(page.getByTestId('company-results-pending')).toContainText('HUF 0');
  });

  test('two accepted quotes add up by VAT rate and by line kind', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    // The draft gets a 5% parts line, is sent and accepted; the sent quote is accepted as it is.
    await quotesPage.openQuote(DRAFT_NUMBER);
    const editor = await quotesPage.startAddLine();
    await editor.getByTestId('quote-line-description-input').fill('Small parts');
    await editor.getByTestId('quote-line-net-price-input').fill('1000');
    await selectDropdownOption(page, 'quote-line-vat-select', '5');
    await editor.getByTestId('quote-line-save-button').click();
    await expect(quotesPage.lineRows()).toHaveCount(2);
    await page.getByTestId('quote-send-button').click();
    await decide(page, quotesPage, 'quote-accept-button');
    await quotesPage.openQuote(SENT_NUMBER);
    await decide(page, quotesPage, 'quote-accept-button');

    await openReport(page);

    // 12,000 + 1,000 + 18,000 net; 15,240 + 1,050 + 22,860 gross.
    await expect(page.getByTestId('company-results-accepted-net')).toHaveText(/31,000/);
    await expect(page.getByTestId('company-results-accepted-gross')).toHaveText(/39,150/);
    await expect(page.getByTestId('company-results-accepted')).toContainText(/From 2 accepted quotes$/);

    const vatRows = page.getByTestId('company-results-vat-row');
    await expect(vatRows).toHaveCount(2);
    await expect(vatRows.nth(0)).toContainText('5%');
    await expect(vatRows.nth(0)).toContainText(/1,000/);
    await expect(vatRows.nth(0)).toContainText(/HUF\s50(?!\d)/);
    await expect(vatRows.nth(1)).toContainText('27%');
    await expect(vatRows.nth(1)).toContainText(/30,000/);
    await expect(vatRows.nth(1)).toContainText(/8,100/);

    await expect(page.getByTestId('company-results-kind-part')).toContainText(/16,290/);
    await expect(page.getByTestId('company-results-kind-part')).toContainText(/13,000 net/);
    await expect(page.getByTestId('company-results-kind-labor')).toContainText(/22,860/);
    await expect(page.getByTestId('company-results-kind-labor')).toContainText(/18,000 net/);
  });
});
