/** A write on a stale appointment gets the 409 conflict toast, a reload and a second try that goes through; an edit
 * and a status change always send the version they were opened with, even when a refetch brought a newer one. */
import { expect, test, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import {
  appointmentUpdatedFrame,
  controlLiveStream,
  recordRequestBodies,
  type LiveStreamControl,
} from './support/appointment-route-overrides';
import { changeTaskElsewhere } from './support/concurrent-changes';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS, type MockApiState } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

const CONFLICT_TOAST = 'Someone else changed this appointment in the meantime. The latest data has been reloaded, please try again.';
const APPOINTMENT_ID = 6801;
const APPOINTMENT_PATH = /^\/api\/appointments\/\d+$/;
const APPOINTMENT_STATUS_PATH = /^\/api\/appointments\/\d+\/status$/;

interface UpdateBody {
  readonly version: number;
}

/** Signs in as an admin who is assigned to one open appointment (so the status control is offered) and shows the scheduler. */
async function openScheduler(page: Page, taskDescription: string): Promise<{ state: MockApiState; schedulerPage: SchedulerPage }> {
  const state = await signInWithMocks(page, { isAdmin: true });
  seedAppointment(state, { id: APPOINTMENT_ID, task: taskDescription, scheduledAt: todayAt(9), mechanicIds: [MOCK_MECHANIC_IDS.admin] });
  const schedulerPage = new SchedulerPage(page);

  return { state, schedulerPage };
}

/** Emits the update frame until the card shows the other user's text; under load a frame can meet a dropped connection. */
async function deliverLiveRefresh(stream: LiveStreamControl, schedulerPage: SchedulerPage) {
  await expect(async () => {
    await stream.emit(appointmentUpdatedFrame(APPOINTMENT_ID));
    await expect(schedulerPage.cardTasks(/^Rewritten by someone else$/)).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
}

/** Resolves when the scheduler has read the current month again, which is what a conflict triggers. */
function monthReloaded(page: Page) {
  const month = String(new Date().getMonth() + 1);

  return page.waitForResponse((response) => (
    response.request().method() === 'GET'
    && response.url().includes('/api/appointments?')
    && new URL(response.url()).searchParams.get('month') === month
  ));
}

test.describe('Scheduler writes on a stale appointment', () => {
  test('a status change toasts the conflict, reloads the appointment and succeeds on the next try', async ({ page }) => {
    const { state, schedulerPage } = await openScheduler(page, 'Stale status check');
    await schedulerPage.goto();
    await schedulerPage.openFirstAppointmentDetail();

    // Another user rewrote the appointment first, so the version this dialog shows is stale.
    changeTaskElsewhere(state, APPOINTMENT_ID, 'Rewritten by someone else');
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
    const { state, schedulerPage } = await openScheduler(page, 'Stale edit check');
    await schedulerPage.goto();
    const detailDialog = await schedulerPage.openFirstAppointmentDetail();

    await detailDialog.getByTestId('appointment-detail-edit').click();
    await detailDialog.locator('textarea').fill('Edited by me');
    await detailDialog.getByTestId('appointment-detail-save').click();
    const confirmDialog = page.getByRole('dialog', { name: /Confirm save/i });
    await expect(confirmDialog).toBeVisible();

    changeTaskElsewhere(state, APPOINTMENT_ID, 'Rewritten by someone else');
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

  test('an edit sends the version it was opened with although a refetch brought a newer one, then saves with the reloaded one', async ({ page }) => {
    const { state, schedulerPage } = await openScheduler(page, 'Lost update check');
    const stream = await controlLiveStream(page);
    const bodies = recordRequestBodies<UpdateBody>(page, 'PUT', APPOINTMENT_PATH);
    await schedulerPage.goto();
    const detailDialog = await schedulerPage.openFirstAppointmentDetail();
    await detailDialog.getByTestId('appointment-detail-edit').click();
    await detailDialog.locator('textarea').fill('Edited by me');

    // Another user saves meanwhile and the live refresh hands the open dialog the new version.
    changeTaskElsewhere(state, APPOINTMENT_ID, 'Rewritten by someone else');
    await deliverLiveRefresh(stream, schedulerPage);
    await expect(detailDialog.locator('textarea')).toHaveValue('Edited by me');

    await detailDialog.getByTestId('appointment-detail-save').click();
    const confirmDialog = page.getByRole('dialog', { name: /Confirm save/i });
    await confirmDialog.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(errorToastMessage(page, CONFLICT_TOAST)).toBeVisible();
    expect(bodies.map((body) => body.version)).toEqual([1]);

    await confirmDialog.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(toastMessage(page, 'Appointment updated successfully.')).toBeVisible();
    expect(bodies.map((body) => body.version)).toEqual([1, 2]);
    expect(state.appointments[0]?.taskDescription).toBe('Edited by me');
  });

  test('a status change sends the version the confirmation was opened with although a refetch brought a newer one, then succeeds when reopened on the reloaded one', async ({ page }) => {
    const { state, schedulerPage } = await openScheduler(page, 'Lost status update check');
    const stream = await controlLiveStream(page);
    const bodies = recordRequestBodies<UpdateBody>(page, 'PUT', APPOINTMENT_STATUS_PATH);
    await schedulerPage.goto();
    await schedulerPage.openFirstAppointmentDetail();
    await schedulerPage.changeAppointmentStatus('Cancelled');
    const confirmDialog = page.getByRole('dialog', { name: /Confirm status change/i });
    await expect(confirmDialog).toBeVisible();

    // Another user saves meanwhile and the live refresh hands the open dialog the new version.
    changeTaskElsewhere(state, APPOINTMENT_ID, 'Rewritten by someone else');
    await deliverLiveRefresh(stream, schedulerPage);

    await confirmDialog.getByRole('button', { name: 'Change status' }).click();

    await expect(errorToastMessage(page, CONFLICT_TOAST)).toBeVisible();
    expect(bodies.map((body) => body.version)).toEqual([1]);

    await schedulerPage.changeAppointmentStatus('Cancelled');
    await confirmDialog.getByRole('button', { name: 'Change status' }).click();

    await expect(toastMessage(page, 'Appointment status updated successfully.')).toBeVisible();
    expect(bodies.map((body) => body.version)).toEqual([1, 2]);
    expect(state.appointments[0]?.status).toBe('Cancelled');
  });
});
