import { expect, test } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { MonthAppointmentListPage } from './pages/month-list.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Scheduler appointment list', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);
  });

  test('month appointment list is visible after login', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    await page.waitForTimeout(2_000);
    const listPage = new MonthAppointmentListPage(page);
    await listPage.expectVisible();
  });

  test('clicking a day filters appointments to that day', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    await scheduler.selectTodayCalendarDay();
    await page.waitForTimeout(1_000);

    const clearChip = page.getByText(/show all|clear/i);
    const chipVisible = await clearChip.isVisible().catch(() => false);
    expect(chipVisible).toBe(true);
  });

  test('clear filter chip removes day filter', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    await scheduler.selectTodayCalendarDay();
    await page.waitForTimeout(1_000);

    const listPage = new MonthAppointmentListPage(page);
    await listPage.clickClearFilter();

    await page.waitForTimeout(500);
    const clearChip = page.getByText(/show all|clear/i);
    const chipStillVisible = await clearChip.isVisible().catch(() => false);
    expect(chipStillVisible).toBe(false);
  });
});
