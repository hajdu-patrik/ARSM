/** The scheduler never acts on state that went stale: a mechanic filter chosen in one month is ignored in a month
 * that lacks that mechanic, and the due labels, the today highlight and the summary move on with the clock. */
import { expect, test, type Page } from '@playwright/test';
import { calendarDayTestId, SchedulerPage } from './pages/scheduler.page';
import {
  HOUR_MS,
  monthWithOffset,
  onDayOfCurrentMonth,
  otherDayOfCurrentMonth,
  seedAppointment,
} from './support/appointment-fixtures';
import { serveAppointmentsByMonth } from './support/appointment-route-overrides';
import { selectDropdownOptionByLabel } from './support/dropdown';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS, type MockApiState } from './support/test-data';

const { peter, mate } = MOCK_MECHANIC_IDS;

/** Signs in and makes the month reads behave like the API: only the appointments of the requested month. */
async function signIn(page: Page): Promise<MockApiState> {
  const state = await signInWithMocks(page);
  await serveAppointmentsByMonth(page, state);

  return state;
}

test.describe('Scheduler month list - mechanic filter across months', () => {
  test('a mechanic chosen in one month does not hide the appointments of a month without that mechanic', async ({ page }) => {
    const state = await signIn(page);
    const next = monthWithOffset(1);
    seedAppointment(state, {
      id: 6501,
      task: 'Peter job this month',
      scheduledAt: onDayOfCurrentMonth(otherDayOfCurrentMonth(), 9),
      mechanicIds: [peter],
    });
    seedAppointment(state, {
      id: 6502,
      task: 'Mate job next month',
      scheduledAt: new Date(next.year, next.month - 1, 12, 9),
      mechanicIds: [mate],
    });
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    const list = scheduler.monthList();
    const mechanicFilter = list.getByRole('combobox', { name: 'All mechanics' });

    await list.getByRole('button', { name: 'Show all' }).click();
    await selectDropdownOptionByLabel(page, mechanicFilter, 'Peter Nagy');
    await expect(scheduler.cardFor('Peter job this month')).toBeVisible();

    await scheduler.nextMonthButton().click();
    await expect(await scheduler.monthHeading(1)).toBeVisible();

    await expect(scheduler.cardFor('Mate job next month')).toBeVisible();
    await expect(list.getByText('No appointments match the filters', { exact: true })).toHaveCount(0);
    await mechanicFilter.click();
    await expect(page.getByRole('option')).toHaveText(['All mechanics', 'Mate Szabo']);
    await page.keyboard.press('Escape');
  });
});

test.describe('Scheduler clock', () => {
  const START_DAY = 15;
  const start = onDayOfCurrentMonth(START_DAY, 23);
  start.setMinutes(58);

  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: start });
  });

  test('the due label of an open appointment counts down as minutes pass in a visible tab', async ({ page }) => {
    const state = await signIn(page);
    seedAppointment(state, {
      id: 6511,
      task: 'Due in three hours',
      scheduledAt: onDayOfCurrentMonth(START_DAY, 9),
      dueAt: new Date(start.getTime() + 3 * HOUR_MS),
    });
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    const dueLabel = scheduler.cardFor('Due in three hours').locator('p', { hasText: /^\d+ days \d+h \d+m left$/ });
    const minutesLeft = async (): Promise<number> => {
      const match = /^(\d+) days (\d+)h (\d+)m left$/.exec((await dueLabel.textContent()) ?? '');

      return match === null ? Number.NaN : Number(match[1]) * 1440 + Number(match[2]) * 60 + Number(match[3]);
    };
    const before = await minutesLeft();
    expect(before).toBeGreaterThan(170);

    await page.clock.runFor('05:00');

    await expect.poll(minutesLeft).toBeLessThanOrEqual(before - 4);
  });

  test('past midnight the today highlight and the summary move to the new day', async ({ page }) => {
    await signIn(page);
    const scheduler = new SchedulerPage(page);
    const today = onDayOfCurrentMonth(START_DAY, 12);
    const tomorrow = onDayOfCurrentMonth(START_DAY + 1, 12);
    await scheduler.goto();

    await scheduler.monthList().getByRole('button', { name: 'Show all' }).click();
    await expect(page.getByText(`Today, ${await scheduler.longDate(today)}`, { exact: true })).toBeVisible();
    await expect(page.getByTestId(calendarDayTestId(today))).toHaveAttribute('aria-current', 'date');

    await page.clock.runFor('05:00');

    await expect(page.getByText(`Today, ${await scheduler.longDate(tomorrow)}`, { exact: true })).toBeVisible();
    await expect(page.getByTestId(calendarDayTestId(tomorrow))).toHaveAttribute('aria-current', 'date');
    await expect(page.getByTestId(calendarDayTestId(today))).not.toHaveAttribute('aria-current', 'date');
  });
});
