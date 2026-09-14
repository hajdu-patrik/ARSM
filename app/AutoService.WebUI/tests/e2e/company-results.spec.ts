import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { QuotesPage } from './pages/quotes.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import type { MockApiState } from './support/test-data';

/** The year the quote fixtures were created in. */
const FIXTURE_YEAR = '2026';

/** Installs the mock and logs in as a mechanic; returns the mutable mock state. */
async function prepareReportPage(page: Page): Promise<MockApiState> {
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  await new AuthPage(page).loginAsMechanic(env);
  return state;
}

/** Opens the report page and waits for the accepted headline to render. */
async function gotoReport(page: Page): Promise<void> {
  await page.goto('/company-results');
  await expect(page.getByRole('heading', { name: 'Company results' })).toBeVisible();
  await expect(page.getByTestId('company-results-accepted')).toBeVisible();
}

/** Accepts the seeded sent quote through the editor, the way a mechanic would. */
async function acceptSentQuote(page: Page): Promise<void> {
  const quotesPage = new QuotesPage(page);
  await quotesPage.goto();
  await quotesPage.openQuote('ARSM-2026-0002');
  await page.getByTestId('quote-accept-button').click();
  await expect(quotesPage.closeEditorButton()).toBeVisible();
  await quotesPage.closeEditorButton().click();
}

test.describe('Company results', () => {
  test('splits sent money into pending and expired, and leaves drafts out of every row', async ({ page }) => {
    await prepareReportPage(page);
    await gotoReport(page);
    await page.getByTestId('company-results-year').selectOption(FIXTURE_YEAR);

    // Nothing is accepted yet. The live sent quote is pending (22,860 gross),
    // the one past its validity is expired (7,620), and the draft is in
    // neither row - only in the count line at the bottom.
    await expect(page.getByTestId('company-results-accepted-gross')).toHaveText('HUF 0');
    await expect(page.getByTestId('company-results-pending')).toContainText(/22,860/);
    await expect(page.getByTestId('company-results-expired')).toContainText(/7,620/);
    await expect(page.getByTestId('company-results-rejected')).toContainText('HUF 0');
    await expect(page.getByText(/Drafts in this period: 1/)).toBeVisible();
  });

  test('counts an accepted quote in the month it was created in', async ({ page }) => {
    await prepareReportPage(page);
    await acceptSentQuote(page);
    await gotoReport(page);
    await page.getByTestId('company-results-year').selectOption(FIXTURE_YEAR);

    // The quote was created in September and accepted now; it still belongs to
    // September, which is the rule the monthly breakdown rests on.
    await expect(page.getByTestId('company-results-accepted-net')).toHaveText(/18,000/);
    await expect(page.getByTestId('company-results-accepted-gross')).toHaveText(/22,860/);
    await expect(page.getByTestId('company-results-pending')).toContainText('HUF 0');

    const septemberRow = page.getByTestId('company-results-month-row').nth(8);
    await expect(septemberRow).toContainText(/22,860/);

    const februaryRow = page.getByTestId('company-results-month-row').nth(1);
    await expect(februaryRow).toContainText('HUF 0');
  });

  test('narrows to a single month, and an empty month still renders with zeros', async ({ page }) => {
    await prepareReportPage(page);
    await acceptSentQuote(page);
    await gotoReport(page);

    await page.getByTestId('company-results-year').selectOption(FIXTURE_YEAR);
    await page.getByTestId('company-results-month').selectOption('9');

    await expect(page.getByTestId('company-results-accepted-gross')).toHaveText(/22,860/);
    await expect(page.getByTestId('company-results-month-row')).toHaveCount(1);

    await page.getByTestId('company-results-month').selectOption('1');
    await expect(page.getByTestId('company-results-accepted-gross')).toHaveText('HUF 0');
    await expect(page.getByTestId('company-results-month-row')).toHaveCount(1);
  });

  test('breaks the accepted revenue down by VAT rate and by line kind', async ({ page }) => {
    await prepareReportPage(page);
    await acceptSentQuote(page);
    await gotoReport(page);
    await page.getByTestId('company-results-year').selectOption(FIXTURE_YEAR);

    const vatRow = page.getByTestId('company-results-vat-row');
    await expect(vatRow).toHaveCount(1);
    await expect(vatRow.first()).toContainText('27%');
    await expect(vatRow.first()).toContainText(/4,860/);

    // The accepted quote holds a labor line only, so parts do not appear.
    await expect(page.getByTestId('company-results-kind-labor')).toContainText(/22,860/);
    await expect(page.getByTestId('company-results-kind-part')).toHaveCount(0);
  });

  test('shows an empty VAT breakdown while the period has no accepted quote', async ({ page }) => {
    await prepareReportPage(page);
    await gotoReport(page);

    await page.getByTestId('company-results-year').selectOption(FIXTURE_YEAR);
    await expect(page.getByTestId('company-results-vat-empty')).toBeVisible();
  });
});
