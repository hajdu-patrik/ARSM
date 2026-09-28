import { expect, test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { SchedulerPage } from './pages/scheduler.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';

/** Creates one appointment through the intake flow so the delete flow has something to act on. */
async function createAppointmentForDelete(schedulerPage: SchedulerPage, taskDescription: string): Promise<void> {
  const dialog = await schedulerPage.openIntakeForCurrentDay();
  await schedulerPage.searchByLicensePlate('NXE-441');
  await dialog.getByRole('button', { name: 'Select' }).first().click();
  await dialog.getByTestId('scheduler-intake-task-description').fill(taskDescription);
  await schedulerPage.createWithCurrentForm();
  await expect(schedulerPage.intakeDialog()).toHaveCount(0);
}

test.describe('Scheduler appointment delete (admin)', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail, isAdmin: true });
    await new AuthPage(page).loginAsMechanic(env);
  });

  test('cancel keeps the appointment, confirm deletes it and shows a toast', async ({ page }) => {
    const schedulerPage = new SchedulerPage(page);
    const taskDescription = 'Delete flow check';

    await schedulerPage.goto();
    await createAppointmentForDelete(schedulerPage, taskDescription);
    await expect(page.getByText(taskDescription)).toBeVisible();

    const detailDialog = await schedulerPage.openFirstAppointmentDetail();
    const confirmDialog = page.getByRole('dialog', { name: /Confirm appointment deletion/i });

    // Cancel closes the confirmation without deleting the appointment.
    await schedulerPage.deleteButton().click();
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmDialog).toHaveCount(0);
    await expect(detailDialog).toBeVisible();
    // The open detail modal repeats the task text, so look for the calendar card only.
    await expect(page.getByRole('region', { name: 'Monthly appointments' }).getByText(taskDescription)).toBeVisible();

    // Confirm deletes it, closes both modals, toasts, and removes it from the view.
    await schedulerPage.deleteButton().click();
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete appointment' }).click();

    await expect(confirmDialog).toHaveCount(0);
    await expect(schedulerPage.detailDialog()).toHaveCount(0);
    // The intake toast from the setup step can still be on screen, so pick the deletion toast.
    await expect(page.locator('output[aria-live="polite"]').filter({ hasText: 'Appointment deleted successfully.' }))
      .toBeVisible();
    await expect(page.getByText(taskDescription)).toHaveCount(0);
  });
});

test.describe('Scheduler appointment delete (non-admin)', () => {
  test('a mechanic without admin rights sees no delete action', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail });
    await new AuthPage(page).loginAsMechanic(env);

    const schedulerPage = new SchedulerPage(page);
    const taskDescription = 'Delete visibility check';

    await schedulerPage.goto();
    await createAppointmentForDelete(schedulerPage, taskDescription);

    await schedulerPage.openFirstAppointmentDetail();
    await expect(schedulerPage.deleteButton()).toHaveCount(0);
  });
});
