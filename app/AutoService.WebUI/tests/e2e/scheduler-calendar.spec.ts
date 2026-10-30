/** The scheduler calendar: the selected day and its summary, month paging within six months of today,
 * the status dot of each day, the kept view after a reload and the 320px layout. */
import { expect, test, type Page } from '@playwright/test';
import { PREF_SIDEBAR_COLLAPSED_KEY } from '../../src/utils/browserStorageKeys';
import { calendarDayTestId, currentDayTestId, SchedulerPage } from './pages/scheduler.page';
import {
  monthWithOffset,
  onDayOfCurrentMonth,
  otherDayOfCurrentMonth,
  seedAppointment,
  todayAt,
  unusedDayOfCurrentMonth,
} from './support/appointment-fixtures';
import { serveAppointmentsByMonth } from './support/appointment-route-overrides';
import { recordGetRequests } from './support/request-log';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS, type MockApiState } from './support/test-data';

/** Signs in and makes the month reads behave like the API: only the appointments of the requested month. */
async function signIn(page: Page): Promise<MockApiState> {
  const state = await signInWithMocks(page);
  await serveAppointmentsByMonth(page, state);

  return state;
}

test.describe('Scheduler calendar - day selection', () => {
  test('selects today first, and a clicked day narrows the summary and the list to that day', async ({ page }) => {
    const state = await signIn(page);
    const otherDate = onDayOfCurrentMonth(otherDayOfCurrentMonth(), 9);
    seedAppointment(state, { id: 6301, task: 'Today early job', scheduledAt: todayAt(8) });
    seedAppointment(state, { id: 6302, status: 'Cancelled', task: 'Today late job', scheduledAt: todayAt(14) });
    seedAppointment(state, { id: 6303, task: 'Other day job', scheduledAt: otherDate });
    const scheduler = new SchedulerPage(page);

    await scheduler.goto();
    await expect(page.getByText(`Selected day, ${await scheduler.longDate(new Date())}`, { exact: true })).toBeVisible();
    await expect(page.getByText('2 scheduled repair tasks', { exact: true })).toBeVisible();
    await expect(scheduler.monthList().getByText('2 appointments', { exact: true })).toBeVisible();
    await expect(scheduler.appointmentCards()).toHaveCount(2);

    await page.getByTestId(calendarDayTestId(otherDate)).click();
    await expect(page.getByText(`Selected day, ${await scheduler.longDate(otherDate)}`, { exact: true })).toBeVisible();
    await expect(page.getByText('1 scheduled repair task', { exact: true })).toBeVisible();
    await expect(scheduler.appointmentCards()).toHaveCount(1);
    await expect(scheduler.cardFor('Other day job')).toBeVisible();

    await scheduler.monthList().getByRole('button', { name: 'Show all' }).click();
    await expect(page.getByText(`Today, ${await scheduler.longDate(new Date())}`, { exact: true })).toBeVisible();
    await expect(page.getByText('2 scheduled repair tasks', { exact: true })).toBeVisible();
    await expect(scheduler.appointmentCards()).toHaveCount(3);
    await expect(scheduler.monthList().getByText('3 appointments', { exact: true })).toBeVisible();
  });

  test('clicking the selected day again clears it, and the intake button then waits for a day', async ({ page }) => {
    await signIn(page);
    const scheduler = new SchedulerPage(page);
    const intakeButton = page.getByTestId('scheduler-intake-open');

    await scheduler.goto();
    await expect(intakeButton).toBeEnabled();

    await page.getByTestId(currentDayTestId()).click();
    await expect(intakeButton).toBeDisabled();
    await expect(page.getByText('Select a day in the calendar to open intake.')).toBeVisible();
    await expect(page.getByText(`Today, ${await scheduler.longDate(new Date())}`, { exact: true })).toBeVisible();

    await page.getByTestId(currentDayTestId()).click();
    await expect(intakeButton).toBeEnabled();
    await expect(page.getByText(`Selected day: ${await scheduler.longDate(new Date())}`, { exact: true })).toBeVisible();
  });

  test('paints a day with the status of its earliest appointment and counts the other ones', async ({ page }) => {
    const state = await signIn(page);
    const otherDay = otherDayOfCurrentMonth();
    const emptyDay = unusedDayOfCurrentMonth(new Date().getDate(), otherDay);
    seedAppointment(state, { id: 6311, task: 'Dot early job', scheduledAt: todayAt(8) });
    seedAppointment(state, { id: 6312, status: 'Cancelled', task: 'Dot late job', scheduledAt: todayAt(15) });
    seedAppointment(state, { id: 6313, status: 'Completed', task: 'Dot done job', scheduledAt: onDayOfCurrentMonth(otherDay, 9) });

    await new SchedulerPage(page).goto();

    const todayCell = page.getByTestId(currentDayTestId());
    await expect(todayCell.locator('span[title]')).toHaveClass(/bg-arsm-warning-accent/);
    await expect(todayCell.locator('span[title]')).toHaveAttribute('title', 'Volkswagen - Dot early job');
    await expect(todayCell.getByText('+1', { exact: true })).toBeVisible();

    const doneCell = page.getByTestId(calendarDayTestId(onDayOfCurrentMonth(otherDay, 0)));
    await expect(doneCell.locator('span[title]')).toHaveClass(/bg-arsm-success-accent/);
    await expect(doneCell.getByText(/^\+\d+$/)).toHaveCount(0);

    const emptyCell = page.getByTestId(calendarDayTestId(onDayOfCurrentMonth(emptyDay, 0)));
    await expect(emptyCell).toBeVisible();
    await expect(emptyCell.locator('span[title]')).toHaveCount(0);
  });
});

test.describe('Scheduler calendar - month paging', () => {
  test('pages through the months, reads the neighbouring ones and clears the selected day', async ({ page }) => {
    const state = await signIn(page);
    const next = monthWithOffset(1);
    const previous = monthWithOffset(-1);
    const afterNext = monthWithOffset(2);
    seedAppointment(state, { id: 6321, task: 'Next month job', scheduledAt: new Date(next.year, next.month - 1, 12, 9) });
    seedAppointment(state, { id: 6322, task: 'Previous month job', scheduledAt: new Date(previous.year, previous.month - 1, 12, 9) });
    const reads = recordGetRequests(page, '/api/appointments');
    const scheduler = new SchedulerPage(page);

    await scheduler.goto();
    await expect(await scheduler.monthHeading(0)).toBeVisible();

    await scheduler.nextMonthButton().click();
    await expect(await scheduler.monthHeading(1)).toBeVisible();
    await expect(page.getByText(`Today, ${await scheduler.longDate(new Date())}`, { exact: true })).toBeVisible();
    await expect(page.getByTestId('scheduler-intake-open')).toBeDisabled();
    await expect(scheduler.cardFor('Next month job')).toBeVisible();
    await expect(scheduler.monthList().getByText('1 appointment', { exact: true })).toBeVisible();
    await expect.poll(() => reads.some((url) => (
      url.searchParams.get('year') === String(afterNext.year) && url.searchParams.get('month') === String(afterNext.month)
    ))).toBe(true);

    await scheduler.previousMonthButton().click();
    await scheduler.previousMonthButton().click();
    await expect(await scheduler.monthHeading(-1)).toBeVisible();
    await expect(scheduler.cardFor('Previous month job')).toBeVisible();
    await expect(scheduler.monthList().getByText('Next month job')).toHaveCount(0);
  });

  test('stops six months before and six months after the current month', async ({ page }) => {
    await signIn(page);
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();

    for (let step = 0; step < 6; step += 1) {
      await scheduler.previousMonthButton().click();
    }
    await expect(await scheduler.monthHeading(-6)).toBeVisible();
    await expect(scheduler.previousMonthButton()).toBeDisabled();

    for (let step = 0; step < 12; step += 1) {
      await scheduler.nextMonthButton().click();
    }
    await expect(await scheduler.monthHeading(6)).toBeVisible();
    await expect(scheduler.nextMonthButton()).toBeDisabled();
    await expect(scheduler.previousMonthButton()).toBeEnabled();
  });

  test('keeps the viewed month of the tab across a reload', async ({ page }) => {
    await signIn(page);
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();

    await scheduler.nextMonthButton().click();
    await expect(await scheduler.monthHeading(1)).toBeVisible();
    await page.reload();

    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
    await expect(await scheduler.monthHeading(1)).toBeVisible();
    await expect(page.getByTestId('scheduler-intake-open')).toBeDisabled();
  });
});

test.describe('Scheduler calendar - 320px', () => {
  test.use({ viewport: { width: 320, height: 900 } });

  test('keeps the calendar, the card and its long text inside the screen', async ({ page }) => {
    const state = await signIn(page);
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'true');
    }, PREF_SIDEBAR_COLLAPSED_KEY);
    seedAppointment(state, {
      id: 6331,
      task: 'W'.repeat(120),
      scheduledAt: todayAt(9),
      mechanicIds: [MOCK_MECHANIC_IDS.peter, MOCK_MECHANIC_IDS.mate, MOCK_MECHANIC_IDS.gabor],
    });
    const scheduler = new SchedulerPage(page);

    await scheduler.goto();

    await expect(scheduler.appointmentCards()).toHaveCount(1);
    await expect(page.getByTestId(currentDayTestId())).toBeVisible();
    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(hasNoHorizontalOverflow).toBe(true);
  });
});
