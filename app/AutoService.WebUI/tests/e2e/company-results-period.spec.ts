/** Company results period picker: the opening period and request, the year range, months that have not
 * started, the fall-back to the whole year, and the Hungarian wording. The clock is pinned to 15 October 2026. */
import { expect, test } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { openReport, pinReportClock, selectReportMonth, selectReportYear } from './support/company-results-period';
import { recordGetRequests } from './support/request-log';
import { signInWithMocks } from './support/sign-in';

const CURRENT_YEAR = 2026;
const OLDEST_YEAR = 2021;
const LAST_STARTED_MONTH = 10;
const REPORT_PATH = '/api/company-results';

/** The `year|month` of the newest report request, or null before the first one. */
function describeLastRequest(urls: readonly URL[]): string | null {
  const last = urls.at(-1);

  return last === undefined ? null : `${String(last.searchParams.get('year'))}|${String(last.searchParams.get('month'))}`;
}

test.describe('Company results - period picker', () => {
  test.beforeEach(async ({ page }) => {
    await pinReportClock(page);
  });

  test('opens on the whole current year and requests exactly that', async ({ page }) => {
    await signInWithMocks(page);
    const urls = recordGetRequests(page, REPORT_PATH);

    await openReport(page);

    await expect(page.getByTestId('company-results-year-value')).toHaveText(String(CURRENT_YEAR));
    await expect(page.getByTestId('company-results-month-all')).toHaveAttribute('aria-pressed', 'true');
    expect(describeLastRequest(urls)).toBe(`${String(CURRENT_YEAR)}|null`);
  });

  test('the year stepper runs from the current year back five years and no further', async ({ page }) => {
    await signInWithMocks(page);
    await openReport(page);
    const previous = page.getByTestId('company-results-year-prev');
    const next = page.getByTestId('company-results-year-next');

    await expect(next).toBeDisabled();
    await expect(previous).toBeEnabled();

    await selectReportYear(page, OLDEST_YEAR);
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();

    await selectReportYear(page, CURRENT_YEAR);
    await expect(next).toBeDisabled();
  });

  test('months that have not started are disabled in the current year only', async ({ page }) => {
    await signInWithMocks(page);
    await openReport(page);

    await expect(page.getByTestId('company-results-month-all')).toBeEnabled();
    for (let month = 1; month <= 12; month += 1) {
      const tile = page.getByTestId(`company-results-month-${String(month)}`);
      if (month <= LAST_STARTED_MONTH) {
        await expect(tile).toBeEnabled();
      } else {
        await expect(tile).toBeDisabled();
      }
    }

    await selectReportYear(page, CURRENT_YEAR - 1);
    await expect(page.getByTestId('company-results-month-12')).toBeEnabled();
  });

  test('a month is requested with its year, and stepping the year keeps it unless it has not started there', async ({ page }) => {
    await signInWithMocks(page);
    const urls = recordGetRequests(page, REPORT_PATH);
    await openReport(page);

    await selectReportYear(page, CURRENT_YEAR - 1);
    await selectReportMonth(page, 3);
    await expect.poll(() => describeLastRequest(urls)).toBe(`${String(CURRENT_YEAR - 1)}|3`);

    await page.getByTestId('company-results-year-next').click();
    await expect(page.getByTestId('company-results-year-value')).toHaveText(String(CURRENT_YEAR));
    await expect(page.getByTestId('company-results-month-3')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => describeLastRequest(urls)).toBe(`${String(CURRENT_YEAR)}|3`);

    await page.getByTestId('company-results-year-prev').click();
    await selectReportMonth(page, 12);
    await page.getByTestId('company-results-year-next').click();

    await expect(page.getByTestId('company-results-year-value')).toHaveText(String(CURRENT_YEAR));
    await expect(page.getByTestId('company-results-month-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('company-results-month-12')).toHaveAttribute('aria-pressed', 'false');
  });

  test('the month tiles are named by the full month', async ({ page }) => {
    await signInWithMocks(page);
    await openReport(page);

    await expect(page.getByTestId('company-results-month-1')).toHaveAccessibleName('January');
    await expect(page.getByTestId('company-results-month-9')).toHaveAccessibleName('September');
    await expect(page.getByTestId('company-results-month-12')).toHaveAccessibleName('December');
    await expect(page.getByTestId('company-results-year-prev')).toHaveAccessibleName('Previous year');
    await expect(page.getByTestId('company-results-year-next')).toHaveAccessibleName('Next year');
  });
});

test.describe('Company results - Hungarian', () => {
  test.beforeEach(async ({ page }) => {
    await pinReportClock(page);
    await primeBrowserState(page, { language: 'hu', sessionHint: true });
    await installApiMocks(page, { profileEmail: 'mechanic.hu@example.test', isAuthenticated: true });
  });

  test('the picker and the amounts read in Hungarian', async ({ page }) => {
    await openReport(page);

    await expect(page.getByTestId('company-results-month-all')).toHaveText('Teljes év');
    await expect(page.getByTestId('company-results-month-1')).toHaveAccessibleName('január');
    await expect(page.getByTestId('company-results-month-12')).toHaveAccessibleName('december');
    await expect(page.getByTestId('company-results-year-prev')).toHaveAccessibleName('Előző év');
    await expect(page.getByTestId('company-results-year-next')).toHaveAccessibleName('Következő év');

    // The sent fixture quote is pending (22 860 gross, 18 000 net); nothing is accepted yet.
    await expect(page.getByTestId('company-results-accepted-gross')).toHaveText(/^0\sFt$/);
    await expect(page.getByTestId('company-results-pending')).toContainText(/22\s860/);
    await expect(page.getByTestId('company-results-pending')).toContainText(/18\s000\sFt\snettó, 1 árajánlat/);
    await expect(page.getByTestId('company-results-accepted')).toContainText('0 elfogadott árajánlatból');
    await expect(page.getByText(/Piszkozatok ebben az időszakban: 1\./)).toBeVisible();
  });
});
