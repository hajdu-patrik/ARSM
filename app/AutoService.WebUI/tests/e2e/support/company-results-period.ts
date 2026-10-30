import { expect, type Page } from '@playwright/test';

/** Steps the year stepper of the company results period picker until it shows the given year. */
export async function selectReportYear(page: Page, year: number): Promise<void> {
  const value = page.getByTestId('company-results-year-value');

  for (let step = 0; step < 10; step += 1) {
    const shown = Number(await value.innerText());

    if (shown === year) {
      break;
    }

    await page.getByTestId(shown > year ? 'company-results-year-prev' : 'company-results-year-next').click();
    await expect(value).not.toHaveText(String(shown));
  }

  await expect(value).toHaveText(String(year));
}

/** Picks a month tile (1-12) of the period picker, or the whole-year tile with 'all'. */
export async function selectReportMonth(page: Page, month: number | 'all'): Promise<void> {
  const tile = page.getByTestId(`company-results-month-${String(month)}`);

  await tile.click();
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
}

/** The pinned "now" of the picker specs: October 2026, so months 11 and 12 are still ahead and 2021 is the oldest year. */
export const REPORT_NOW = new Date('2026-10-15T12:00:00.000Z');

/** Fixes the browser clock before the first navigation, so the current year and month do not depend on the run date. */
export async function pinReportClock(page: Page): Promise<void> {
  await page.clock.setFixedTime(REPORT_NOW);
}

/** Opens the report page and waits for the accepted headline to render. */
export async function openReport(page: Page): Promise<void> {
  await page.goto('/company-results');
  await expect(page.getByTestId('company-results-accepted')).toBeVisible();
}
