/** The scheduler places an appointment by the viewer's local date although the API cuts its month reads in UTC:
 * with the browser in Europe/Budapest an appointment at 23:30 UTC on the last day of a month is the first of the next one. */
import { expect, test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { SchedulerPage } from './pages/scheduler.page';
import { installApiMocks } from './support/api-mocks';
import { seedAppointment } from './support/appointment-fixtures';
import { serveAppointmentsByUtcMonth } from './support/appointment-route-overrides';
import { getAppointmentFlowEnv } from './support/e2e-env';

const ZONE = 'Europe/Budapest';
const HALF_HOUR_MS = 30 * 60 * 1000;

interface CalendarMonth {
  readonly year: number;
  readonly month: number;
}

/** The month (1 to 12) the browser, which runs in Budapest, is in now. */
function currentBudapestMonth(): CalendarMonth {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: 'numeric' }).formatToParts(new Date());
  const read = (type: string): number => Number(parts.find((part) => part.type === type)?.value);

  return { year: read('year'), month: read('month') };
}

/** Test id of the first day of the month after the given one. */
function firstDayOfNextMonthTestId({ year, month }: CalendarMonth): string {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return `calendar-day-${String(nextYear)}-${String(nextMonth).padStart(2, '0')}-01`;
}

test.describe('Scheduler month placement in the viewer time zone', () => {
  test.use({ timezoneId: ZONE });

  test('an appointment at 23:30 UTC on the last day of the month is listed under the 1st of the next month, not in this one', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    const now = currentBudapestMonth();
    // Date.UTC takes a 0-based month, so the 1-based current month is the next one: its first instant minus 30 minutes.
    const lastHalfHourOfUtcMonth = new Date(Date.UTC(now.year, now.month, 1) - HALF_HOUR_MS);
    const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
    seedAppointment(state, { id: 6861, task: 'Midnight job', scheduledAt: lastHalfHourOfUtcMonth });
    await serveAppointmentsByUtcMonth(page, state);
    await new AuthPage(page).loginAsMechanic(env);
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    const list = scheduler.monthList();

    await list.getByRole('button', { name: 'Show all' }).click();
    await expect(list.getByText('No appointments this month', { exact: true })).toBeVisible();
    await expect(scheduler.cardTasks(/Midnight job/)).toHaveCount(0);

    await scheduler.nextMonthButton().click();
    await page.getByTestId(firstDayOfNextMonthTestId(now)).click();

    await expect(scheduler.cardFor('Midnight job')).toBeVisible();
    await expect(page.getByText('1 scheduled repair task', { exact: true })).toBeVisible();
  });
});
