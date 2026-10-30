/** The scheduler follows the appointment live stream: a frame from the server refreshes the reads, the client
 * reconnects after a lost connection, and an open detail dialog follows the appointment it shows. */
import { expect, test, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import {
  appointmentUpdatedFrame,
  controlLiveStream,
  serveAppointmentsByMonth,
  type LiveStreamControl,
} from './support/appointment-route-overrides';
import { changeTaskElsewhere } from './support/concurrent-changes';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';
import type { MockApiState } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

interface LiveScheduler {
  readonly state: MockApiState;
  readonly stream: LiveStreamControl;
  readonly scheduler: SchedulerPage;
}

/** Seeds, then signs in as an admin with a scripted live stream (it fails its first `failFirst` attempts), which lands on the scheduler. */
async function openLiveScheduler(page: Page, failFirst = 0, seed: (state: MockApiState) => void = () => undefined): Promise<LiveScheduler> {
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail, isAdmin: true });
  seed(state);
  const stream = await controlLiveStream(page, failFirst);
  await serveAppointmentsByMonth(page, state);
  await new AuthPage(page).loginAsMechanic(env);

  return { state, stream, scheduler: new SchedulerPage(page) };
}

test.describe('Scheduler live update channel', () => {
  test('opens the stream and shows an appointment that another user added once the server announces it', async ({ page }) => {
    const { state, stream, scheduler } = await openLiveScheduler(page);
    await expect.poll(() => stream.attempts()).toBeGreaterThanOrEqual(1);
    await expect(scheduler.monthList().getByText('No appointments on this day', { exact: true })).toBeVisible();

    seedAppointment(state, { id: 6341, task: 'Added by someone else', scheduledAt: todayAt(10) });
    await stream.emit(appointmentUpdatedFrame(6341));

    await expect(scheduler.cardFor('Added by someone else')).toBeVisible();
    await expect(page.getByText('1 scheduled repair task', { exact: true })).toBeVisible();
    await expect(scheduler.monthList().getByText('1 appointment', { exact: true })).toBeVisible();
  });

  test('reconnects after the connection was lost and then applies what the server announces', async ({ page }) => {
    const { state, stream, scheduler } = await openLiveScheduler(page, 1);
    await expect.poll(() => stream.attempts(), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);

    seedAppointment(state, { id: 6342, task: 'Added after reconnect', scheduledAt: todayAt(10) });
    await stream.emit(appointmentUpdatedFrame(6342));

    await expect(scheduler.cardFor('Added after reconnect')).toBeVisible();
  });

  test('reconnects again after a frame, because the stream ends with it', async ({ page }) => {
    const { state, stream, scheduler } = await openLiveScheduler(page);

    seedAppointment(state, { id: 6343, task: 'First announced job', scheduledAt: todayAt(9) });
    await stream.emit(appointmentUpdatedFrame(6343));
    await expect(scheduler.cardFor('First announced job')).toBeVisible();

    seedAppointment(state, { id: 6344, task: 'Second announced job', scheduledAt: todayAt(11) });
    await stream.emit(appointmentUpdatedFrame(6344));

    await expect(scheduler.cardFor('Second announced job')).toBeVisible();
    expect(stream.attempts()).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Scheduler live update of an open detail dialog', () => {
  test('shows the appointment as another user changed it, and the next status change needs no retry', async ({ page }) => {
    const { state, stream, scheduler } = await openLiveScheduler(page, 0, (seedState) => {
      seedAppointment(seedState, { id: 6351, task: 'Live detail task', scheduledAt: todayAt(9) });
    });
    const dialog = await scheduler.openFirstAppointmentDetail();

    changeTaskElsewhere(state, 6351, 'Edited by someone else');
    await stream.emit(appointmentUpdatedFrame(6351));
    await expect(dialog.getByText('Edited by someone else', { exact: true })).toBeVisible();

    await scheduler.changeAppointmentStatus('Cancelled');
    await page.getByRole('dialog', { name: 'Confirm status change' }).getByRole('button', { name: 'Change status' }).click();

    await expect(toastMessage(page, 'Appointment status updated successfully.')).toBeVisible();
    await expect(errorToastMessage(page, /Someone else changed this appointment/)).toHaveCount(0);
  });

  test('closes by itself when another user deleted the appointment', async ({ page }) => {
    const { state, stream, scheduler } = await openLiveScheduler(page, 0, (seedState) => {
      seedAppointment(seedState, { id: 6352, task: 'Deleted elsewhere', scheduledAt: todayAt(9) });
    });
    await scheduler.openFirstAppointmentDetail();

    state.appointments.splice(0);
    await stream.emit(appointmentUpdatedFrame(6352));

    await expect(scheduler.detailDialog()).toHaveCount(0);
    await expect(scheduler.appointmentCards()).toHaveCount(0);
  });
});
