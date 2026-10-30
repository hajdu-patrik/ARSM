/** A failed month read toasts once per failure episode, names an expired session apart, and a later success re-arms it. */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import { dismissToasts } from './support/appointment-ui';
import { refuseApiRoute, type Refusal } from './support/appointment-route-overrides';
import { installApiMocks } from './support/api-mocks';
import type { TestLanguage } from './support/browser-state';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { recordGetRequests } from './support/request-log';
import { errorToastMessage } from './support/toast';

const MONTH_LOAD_ERROR = 'Failed to load monthly appointments.';
const SESSION_ERROR = 'Your session has expired. Please log in again to load monthly appointments.';

/** Signs in with the month reads refused from the very first one, and lands on the scheduler. */
async function openWithFailingReads(page: Page, status: number, language: TestLanguage = 'en'): Promise<Refusal> {
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  seedAppointment(state, { id: 6361, task: 'Recovered task', scheduledAt: todayAt(10) });
  const refusal = await refuseApiRoute(page, '/api/appointments', 'GET', status, { detail: 'Refused.' });
  await new AuthPage(page).loginAsMechanic(env, language);

  return refusal;
}

/** Announces a change the way the live stream does, which makes the scheduler read its months again. */
async function announceChange(page: Page): Promise<void> {
  await page.evaluate(() => {
    globalThis.dispatchEvent(new CustomEvent('autoservice:appointment-updated', {
      detail: { appointmentId: 6361, occurredAt: Date.now() },
    }));
  });
}

test.describe('Scheduler month read failure', () => {
  test('toasts one failure for the whole month window and shows an empty list', async ({ page }) => {
    await openWithFailingReads(page, 404);
    const scheduler = new SchedulerPage(page);

    await expect(errorToastMessage(page, MONTH_LOAD_ERROR)).toBeVisible();
    await expect(errorToastMessage(page, MONTH_LOAD_ERROR)).toHaveCount(1);
    await expect(scheduler.monthList().getByText('No appointments on this day', { exact: true })).toBeVisible();
  });

  test('names an expired or forbidden session apart from a plain failure', async ({ page }) => {
    await openWithFailingReads(page, 403);

    await expect(errorToastMessage(page, SESSION_ERROR)).toBeVisible();
    await expect(errorToastMessage(page, MONTH_LOAD_ERROR)).toHaveCount(0);
  });

  test('words the failure in Hungarian', async ({ page }) => {
    await openWithFailingReads(page, 404, 'hu');

    await expect(errorToastMessage(page, 'Nem sikerült betölteni a havi időpontokat.')).toBeVisible();
  });

  test('stays quiet while the failure goes on, and toasts again after a success in between', async ({ page }) => {
    const reads = recordGetRequests(page, '/api/appointments');
    const refusal = await openWithFailingReads(page, 404);
    const scheduler = new SchedulerPage(page);
    await expect(errorToastMessage(page, MONTH_LOAD_ERROR)).toHaveCount(1);

    // Three month reads, each tried twice (one retry), have to fail again before the toast count means anything.
    const readsBefore = reads.length;
    await announceChange(page);
    await expect.poll(() => reads.length).toBeGreaterThanOrEqual(readsBefore + 6);
    await expect(errorToastMessage(page, MONTH_LOAD_ERROR)).toHaveCount(1);

    refusal.lift();
    await announceChange(page);
    await expect(scheduler.cardFor('Recovered task')).toBeVisible();
    await dismissToasts(page);

    refusal.restore();
    await announceChange(page);
    await expect(errorToastMessage(page, MONTH_LOAD_ERROR)).toHaveCount(1);
  });
});
