import { expect, test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { currentDayTestId, SchedulerPage } from './pages/scheduler.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import { MOCK_MECHANIC_IDS } from './support/test-data';

/** Status dot colors the calendar grid paints per appointment status. */
const IN_PROGRESS_DOT = 'bg-arsm-warning-accent';
const CANCELLED_DOT = 'bg-arsm-error-accent';

test.describe('Scheduler live status propagation', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    // Status changes need an assigned mechanic, so the seeded appointment is assigned to the admin.
    const state = await installApiMocks(page, { profileEmail: env.mechanicEmail, isAdmin: true });
    seedAppointment(state, {
      id: 6361,
      task: 'Live status propagation check',
      scheduledAt: todayAt(9),
      mechanicIds: [MOCK_MECHANIC_IDS.admin],
    });
    await new AuthPage(page).loginAsMechanic(env);
  });

  test('recolors the calendar day dot on status change without a page reload', async ({ page }) => {
    const schedulerPage = new SchedulerPage(page);

    await schedulerPage.goto();

    // The seeded appointment is InProgress, so the calendar dot starts amber.
    const dayCell = page.getByTestId(currentDayTestId());
    // The status dot is the only span in the cell that carries a title attribute.
    const statusDot = dayCell.locator('span[title]').first();
    await expect(statusDot).toHaveClass(new RegExp(IN_PROGRESS_DOT));

    // A reload starts a new document with a new time origin, so this pins the current document.
    const timeOriginBefore = await page.evaluate(() => performance.timeOrigin);

    await page.getByRole('button', { name: 'Appointment details' }).first().click();
    const detailDialog = page.getByRole('dialog', { name: /Appointment details/i });
    await expect(detailDialog).toBeVisible();

    await schedulerPage.changeAppointmentStatus('Cancelled');
    const confirmDialog = page.getByRole('dialog', { name: /Confirm status change/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Change status' }).click();
    await expect(confirmDialog).toHaveCount(0);

    // The dot must recolor from the live store, with no reload in between.
    await expect(statusDot).toHaveClass(new RegExp(CANCELLED_DOT));
    await expect(statusDot).not.toHaveClass(new RegExp(IN_PROGRESS_DOT));

    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOriginBefore);
  });
});
