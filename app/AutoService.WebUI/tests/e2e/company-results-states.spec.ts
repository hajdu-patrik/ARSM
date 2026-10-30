/** Company results states: one month's own figures, the twelve month rows, the loading text and the
 * unavailable report. The clock is pinned to 15 October 2026, the year the quote fixtures live in. */
import { expect, test } from '@playwright/test';
import { fulfillJson } from './support/api-mock-response';
import { openReport, pinReportClock, selectReportMonth } from './support/company-results-period';
import { signInWithMocks } from './support/sign-in';
import { MOCK_QUOTE_IDS } from './support/test-data';
import { errorToastMessage } from './support/toast';

const REPORT_PATH = '/api/company-results';
const REPORT_DELAY_MS = 1500;

test.describe('Company results - states', () => {
  test.beforeEach(async ({ page }) => {
    await pinReportClock(page);
  });

  test('a month shows only its own pending, expired and draft figures', async ({ page }) => {
    await signInWithMocks(page);
    await openReport(page);
    const monthRows = page.getByTestId('company-results-month-row');

    // February holds the expired quote, September the live sent one and the draft.
    await selectReportMonth(page, 2);
    await expect(page.getByTestId('company-results-expired')).toContainText(/7,620/);
    await expect(page.getByTestId('company-results-pending')).toContainText('HUF 0');
    await expect(page.getByText(/Drafts in this period: 0\./)).toBeVisible();
    await expect(monthRows).toHaveCount(1);
    await expect(monthRows.first()).toContainText('February');

    await selectReportMonth(page, 9);
    await expect(page.getByTestId('company-results-pending')).toContainText(/22,860/);
    await expect(page.getByTestId('company-results-expired')).toContainText('HUF 0');
    await expect(page.getByText(/Drafts in this period: 1\./)).toBeVisible();
    await expect(monthRows.first()).toContainText('September');
  });

  test('the whole year lists the twelve months in order, with the accepted money in its own month', async ({ page }) => {
    const state = await signInWithMocks(page);
    const sent = state.quotes.find((quote) => quote.id === MOCK_QUOTE_IDS.sentDiagnostics);
    if (sent === undefined) {
      throw new Error('The fixture sent quote is missing.');
    }
    sent.status = 'Accepted';

    await openReport(page);
    const monthRows = page.getByTestId('company-results-month-row');

    await expect(monthRows).toHaveCount(12);
    await expect(monthRows.first()).toContainText('January');
    await expect(monthRows.last()).toContainText('December');
    await expect(monthRows.nth(8)).toContainText('September');
    await expect(monthRows.nth(8).locator('[data-column="quotes"]')).toContainText('1');
    await expect(monthRows.nth(8).locator('[data-column="gross"]')).toContainText('22,860');
    await expect(monthRows.first().locator('[data-column="gross"]')).toContainText('HUF 0');
  });

  test('the loading text shows while the report is on its way', async ({ page }) => {
    await signInWithMocks(page);
    await page.route((url) => url.pathname === REPORT_PATH, async (route) => {
      await new Promise((resolve) => { setTimeout(resolve, REPORT_DELAY_MS); });
      await route.fallback();
    });

    await page.goto('/company-results');

    await expect(page.getByText('Loading the report...')).toBeVisible();
    await expect(page.getByTestId('company-results-accepted')).toBeVisible();
    await expect(page.getByText('Loading the report...')).toHaveCount(0);
  });

  test('a report that cannot be loaded says so and toasts the failure', async ({ page }) => {
    await signInWithMocks(page);
    await page.route((url) => url.pathname === REPORT_PATH, (route) => fulfillJson(route, { detail: 'Rejected.' }, 400));

    await page.goto('/company-results');

    await expect(page.getByTestId('company-results-unavailable')).toHaveText('Failed to load the company results.');
    await expect(errorToastMessage(page, 'Failed to load the company results.')).toBeVisible();
    await expect(page.getByTestId('company-results-accepted')).toHaveCount(0);
  });
});
