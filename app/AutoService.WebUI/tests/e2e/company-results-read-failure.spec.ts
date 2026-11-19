/** A failing report read toasts once per failure episode, stays quiet while it goes on and toasts again after a
 * success. The clock is pinned to 15 October 2026, so the month tile used below is always in the past. */
import { expect, test } from '@playwright/test';
import { refuseApiRoute } from './support/appointment-route-overrides';
import { dismissToasts } from './support/appointment-ui';
import { pinReportClock, selectReportMonth } from './support/company-results-period';
import { recordGetRequests } from './support/request-log';
import { refocusTab } from './support/refocus-tab';
import { signInWithMocks } from './support/sign-in';
import { errorToastMessage } from './support/toast';

const REPORT_PATH = '/api/company-results';
const LOAD_FAILED = 'Failed to load the company results.';
/** Lets a late toast of the last failed read show up before the toast count is read. */
const SETTLE_MS = 500;
const READ_TIMEOUT_MS = 10_000;

test.describe('Company results - read failure', () => {
  test.beforeEach(async ({ page }) => {
    await pinReportClock(page);
  });

  test('toasts a failing report once, stays quiet while it goes on and toasts again after a success', async ({ page }) => {
    const reads = recordGetRequests(page, REPORT_PATH);
    await signInWithMocks(page);
    const refusal = await refuseApiRoute(page, REPORT_PATH, 'GET', 400, { detail: 'Refused.' });
    const failureToast = errorToastMessage(page, LOAD_FAILED);

    await page.goto('/company-results');
    await expect(failureToast).toHaveCount(1);

    // A read is tried twice (one retry) before it counts as failed again.
    const readsBefore = reads.length;
    await refocusTab(page);
    await expect.poll(() => reads.length, { timeout: READ_TIMEOUT_MS }).toBeGreaterThanOrEqual(readsBefore + 2);
    await page.waitForTimeout(SETTLE_MS);
    await expect(failureToast).toHaveCount(1);

    refusal.lift();
    await refocusTab(page);
    await expect(page.getByTestId('company-results-accepted')).toBeVisible();
    await dismissToasts(page);

    refusal.restore();
    await selectReportMonth(page, 2);
    await expect(failureToast).toHaveCount(1);
  });
});
