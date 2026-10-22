/** A status change or an edit made on a stale appointment is refused with a 409: the user gets the conflict
 * toast, the scheduler reads reload, and the same action goes through on the next try. */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { SchedulerPage } from './pages/scheduler.page';
import { installApiMocks } from './support/api-mocks';
import { changeTaskElsewhere } from './support/concurrent-changes';
import { getAppointmentFlowEnv } from './support/e2e-env';
import type { MockApiState } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

const CONFLICT_TOAST = 'Someone else changed this appointment in the meantime. The latest data has been reloaded, please try again.';

/** Signs in as an admin (who may change every appointment) and creates one appointment through the intake. */
async function createAppointment(page: Page, taskDescription: string): Promise<{ state: MockApiState; schedulerPage: SchedulerPage }> {
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail, isAdmin: true });
  await new AuthPage(page).loginAsMechanic(env);

  const schedulerPage = new SchedulerPage(page);
  await schedulerPage.goto();
  await schedulerPage.createIntake('NXE-441', taskDescription);

  return { state, schedulerPage };
}

/** The id of the one appointment the intake created in the mock state. */
function createdAppointmentId(state: MockApiState): number {
  const [appointment] = state.appointments;
  if (appointment === undefined) {
    throw new Error('The intake did not create an appointment.');
  }

  return appointment.id;
}

/** Resolves when the scheduler has read the current month again, which is what a conflict triggers. */
function monthReloaded(page: Page) {
  const month = `month=${String(new Date().getMonth() + 1)}`;

  return page.waitForResponse((response) => (
    response.request().method() === 'GET' && response.url().includes('/api/appointments?') && response.url().includes(month)
  ));
}

test.describe('Scheduler writes on a stale appointment', () => {
  test('a status change toasts the conflict, reloads the appointment and succeeds on the next try', async ({ page }) => {
    const { state, schedulerPage } = await createAppointment(page, 'Stale status check');
    await schedulerPage.openFirstAppointmentDetail();

    // Another user rewrote the appointment first, so the version this dialog shows is stale.
    changeTaskElsewhere(state, createdAppointmentId(state), 'Rewritten by someone else');
    const reloaded = monthReloaded(page);
    await schedulerPage.changeAppointmentStatus('Cancelled');
    await page.getByRole('dialog', { name: /Confirm status change/i }).getByRole('button', { name: 'Change status' }).click();

    await expect(errorToastMessage(page, CONFLICT_TOAST)).toBeVisible();
    await reloaded;
    await expect(schedulerPage.detailDialog().getByText('Rewritten by someone else')).toBeVisible();

    await schedulerPage.changeAppointmentStatus('Cancelled');
    await page.getByRole('dialog', { name: /Confirm status change/i }).getByRole('button', { name: 'Change status' }).click();

    await expect(toastMessage(page, 'Appointment status updated successfully.')).toBeVisible();
  });

  test('an edit toasts the conflict, reloads the appointment and saves on the next try', async ({ page }) => {
    const { state, schedulerPage } = await createAppointment(page, 'Stale edit check');
    const detailDialog = await schedulerPage.openFirstAppointmentDetail();

    await detailDialog.getByTestId('appointment-detail-edit').click();
    await detailDialog.locator('textarea').fill('Edited by me');
    await detailDialog.getByTestId('appointment-detail-save').click();
    const confirmDialog = page.getByRole('dialog', { name: /Confirm save/i });
    await expect(confirmDialog).toBeVisible();

    changeTaskElsewhere(state, createdAppointmentId(state), 'Rewritten by someone else');
    const reloaded = monthReloaded(page);
    await confirmDialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, CONFLICT_TOAST)).toBeVisible();
    await reloaded;

    // The confirmation stays open and now carries the current version, so confirming again saves.
    await confirmDialog.getByRole('button', { name: 'Save' }).click();

    await expect(toastMessage(page, 'Appointment updated successfully.')).toBeVisible();
    await expect(confirmDialog).toHaveCount(0);
    await expect(schedulerPage.detailDialog().getByText('Edited by me')).toBeVisible();
  });
});
