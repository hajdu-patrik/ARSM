import { expect, test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { SchedulerPage } from './pages/scheduler.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';

/** Status dot colors the calendar grid paints per appointment status. */
const IN_PROGRESS_DOT = 'bg-arsm-warning-accent';
const CANCELLED_DOT = 'bg-arsm-error-accent';

/** Returns the data-testid the calendar grid renders for today's cell. */
function currentDayTestId(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `calendar-day-${today.getFullYear()}-${month}-${day}`;
}

test.describe('Scheduler live status propagation', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    // Status changes require isAdmin or an assigned mechanic; admin keeps the setup minimal.
    await installApiMocks(page, { profileEmail: env.mechanicEmail, isAdmin: true });
    await new AuthPage(page).loginAsMechanic(env);
  });

  test('recolors the calendar day dot on status change without a page reload', async ({ page }) => {
    const schedulerPage = new SchedulerPage(page);
    const taskDescription = 'Live status propagation check';

    await schedulerPage.goto();
    const dialog = await schedulerPage.openIntakeForCurrentDay();
    await schedulerPage.searchByLicensePlate('NXE-441');
    await dialog.getByRole('button', { name: 'Select' }).first().click();
    await dialog.getByTestId('scheduler-intake-task-description').fill(taskDescription);
    await schedulerPage.createWithCurrentForm();
    await expect(schedulerPage.intakeDialog()).toHaveCount(0);

    // A new intake is InProgress, so the calendar dot starts amber.
    const dayCell = page.getByTestId(currentDayTestId());
    // The status dot is the only span in the cell that carries a title attribute.
    const statusDot = dayCell.locator('span[title]').first();
    await expect(statusDot).toHaveClass(new RegExp(IN_PROGRESS_DOT));

    // Capture the navigation state so the assertion below cannot be satisfied by a reload.
    await page.evaluate(() => {
      (window as unknown as { __arsmNoReload: boolean }).__arsmNoReload = true;
    });

    await page.getByRole('button', { name: 'Appointment details' }).first().click();
    const detailDialog = page.getByRole('dialog', { name: /Appointment details/i });
    await expect(detailDialog).toBeVisible();

    await detailDialog.getByLabel('Change appointment status').selectOption('Cancelled');
    const confirmDialog = page.getByRole('dialog', { name: /Confirm status change/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Change status' }).click();
    await expect(confirmDialog).toHaveCount(0);

    // The dot must recolor from the live store, with no reload in between.
    await expect(statusDot).toHaveClass(new RegExp(CANCELLED_DOT));
    await expect(statusDot).not.toHaveClass(new RegExp(IN_PROGRESS_DOT));

    const survivedWithoutReload = await page.evaluate(
      () => (window as unknown as { __arsmNoReload?: boolean }).__arsmNoReload === true,
    );
    expect(survivedWithoutReload).toBe(true);
  });
});
