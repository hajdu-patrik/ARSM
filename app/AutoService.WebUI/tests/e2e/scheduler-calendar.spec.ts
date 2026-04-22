import { expect, test } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Scheduler calendar navigation', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);
  });

  test('calendar renders current month with today cell', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayCell = page.getByTestId(`calendar-day-${yyyy}-${mm}-${dd}`);
    await expect(todayCell).toBeVisible();
  });

  test('clicking a day cell selects it with ring highlight', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    await scheduler.selectTodayCalendarDay();
    const selectedId = await scheduler.getSelectedDayTestId();
    expect(selectedId).toBeTruthy();
  });

  test('navigate to next month updates calendar', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const headerBefore = await scheduler.getMonthHeaderText();
    await scheduler.navigateNextMonth();
    await page.waitForTimeout(500);
    const headerAfter = await scheduler.getMonthHeaderText();

    expect(headerAfter).not.toBe(headerBefore);
  });

  test('navigate to previous month updates calendar', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    await scheduler.navigateNextMonth();
    await page.waitForTimeout(300);
    const headerAfterNext = await scheduler.getMonthHeaderText();

    await scheduler.navigatePrevMonth();
    await page.waitForTimeout(300);
    const headerAfterPrev = await scheduler.getMonthHeaderText();

    expect(headerAfterPrev).not.toBe(headerAfterNext);
  });

  test('month change clears selected day', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    await scheduler.selectTodayCalendarDay();
    expect(await scheduler.getSelectedDayTestId()).toBeTruthy();

    await scheduler.navigateNextMonth();
    await page.waitForTimeout(500);

    const selectedAfter = await scheduler.getSelectedDayTestId();
    expect(selectedAfter).toBeNull();
  });
});
