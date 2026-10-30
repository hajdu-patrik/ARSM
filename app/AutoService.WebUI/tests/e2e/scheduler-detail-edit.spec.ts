/** The appointment detail dialog: what it shows, the edit mode with its save rules and payload, and the status confirmation. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { DAY_MS, seedAppointment, toDatetimeLocalValue, todayAt } from './support/appointment-fixtures';
import { recordRequestBodies } from './support/appointment-route-overrides';
import { signInWithMocks } from './support/sign-in';
import type { MockApiState } from './support/test-data';
import { toastMessage } from './support/toast';

const HOUR_MS = 60 * 60 * 1000;
const SCHEDULED_AT = todayAt(9);
const DUE_AT = new Date(SCHEDULED_AT.getTime() + 2 * DAY_MS);
const APPOINTMENT_PATH = /^\/api\/appointments\/\d+$/;

interface UpdateBody {
  readonly dueDateTime: string;
  readonly taskDescription: string;
  readonly version: number;
}

/** Signs in as an admin with one open appointment and opens its detail dialog. */
async function openDetail(page: Page): Promise<{ state: MockApiState; scheduler: SchedulerPage; dialog: Locator }> {
  const state = await signInWithMocks(page, { isAdmin: true });
  seedAppointment(state, { id: 6901, task: 'Detail task', scheduledAt: SCHEDULED_AT, dueAt: DUE_AT });
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();

  return { state, scheduler, dialog: await scheduler.openFirstAppointmentDetail() };
}

test.describe('Scheduler detail dialog', () => {
  test('shows the status, the due time, the task and every vehicle value, without horsepower or torque', async ({ page }) => {
    const { dialog } = await openDetail(page);

    await expect(dialog.getByTestId('appointment-status-badge')).toContainText('In progress');
    await expect(dialog.getByText(/^Due at /)).toBeVisible();
    await expect(dialog.getByText('Detail task', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Volkswagen Golf (2018)' })).toBeVisible();
    for (const value of ['NXE-441', 'WVWZZZAUZJW123456', 'Volkswagen', 'Golf', '2018', '110 kW', 'Hybrid']) {
      await expect(dialog.getByText(value, { exact: true })).toBeVisible();
    }
    await expect(dialog.getByText(/124.500 km/)).toBeVisible();
    await expect(dialog).not.toContainText(/HP|Torque/);
  });

  test('closes with the close button and with Escape', async ({ page }) => {
    const { scheduler, dialog } = await openDetail(page);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await scheduler.openFirstAppointmentDetail();
    await scheduler.detailDialog().getByRole('button', { name: 'Close dialog' }).click();
    await expect(scheduler.detailDialog()).toHaveCount(0);
  });
});

test.describe('Scheduler detail edit', () => {
  test('swaps the task and the due time for inputs and hides the other actions', async ({ page }) => {
    const { dialog } = await openDetail(page);

    await dialog.getByTestId('appointment-detail-edit').click();

    await expect(dialog.locator('textarea')).toHaveValue('Detail task');
    await expect(dialog.getByTestId('appointment-detail-due-datetime')).toHaveValue(toDatetimeLocalValue(DUE_AT));
    await expect(dialog.getByTestId('appointment-detail-save')).toBeDisabled();
    for (const hidden of ['appointment-detail-edit', 'appointment-detail-delete', 'appointment-detail-edit-vehicle']) {
      await expect(dialog.getByTestId(hidden)).toHaveCount(0);
    }
    await expect(dialog.getByRole('combobox', { name: 'Change appointment status' })).toHaveCount(0);
    await expect(dialog.getByText('Assigned mechanics')).toHaveCount(0);
  });

  test('saves only a filled task and a due time that is not before the scheduled time and differs from the saved one', async ({ page }) => {
    const { dialog } = await openDetail(page);
    const task = dialog.locator('textarea');
    const due = dialog.getByTestId('appointment-detail-due-datetime');
    const save = dialog.getByTestId('appointment-detail-save');
    await dialog.getByTestId('appointment-detail-edit').click();

    await task.fill('   ');
    await expect(save).toBeDisabled();
    await task.fill('Detail task changed');
    await expect(save).toBeEnabled();

    await due.fill(toDatetimeLocalValue(new Date(SCHEDULED_AT.getTime() - HOUR_MS)));
    await expect(save).toBeDisabled();
    await due.fill(toDatetimeLocalValue(new Date(DUE_AT.getTime() + HOUR_MS)));
    await expect(save).toBeEnabled();

    await task.fill('Detail task');
    await expect(save).toBeEnabled();
    await due.fill(toDatetimeLocalValue(DUE_AT));
    await expect(save).toBeDisabled();
  });

  test('sends the trimmed task with the version it showed, then shows the saved values', async ({ page }) => {
    const { dialog } = await openDetail(page);
    const bodies = recordRequestBodies<UpdateBody>(page, 'PUT', APPOINTMENT_PATH);
    const newDue = toDatetimeLocalValue(new Date(DUE_AT.getTime() + HOUR_MS));

    await dialog.getByTestId('appointment-detail-edit').click();
    await dialog.locator('textarea').fill('  Brake pads replaced  ');
    await dialog.getByTestId('appointment-detail-due-datetime').fill(newDue);
    await dialog.getByTestId('appointment-detail-save').click();
    const confirm = page.getByRole('dialog', { name: 'Confirm save' });
    await expect(confirm).toContainText('Save the edited appointment data?');
    await confirm.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(toastMessage(page, 'Appointment updated successfully.')).toBeVisible();
    expect(bodies).toEqual([{ dueDateTime: new Date(newDue).toISOString(), taskDescription: 'Brake pads replaced', version: 1 }]);
    await expect(dialog.getByText('Brake pads replaced', { exact: true })).toBeVisible();
    await expect(dialog.getByTestId('appointment-detail-edit')).toBeVisible();
  });

  test('Escape leaves the edit mode and cancelling the save confirmation sends nothing', async ({ page }) => {
    const { state, dialog } = await openDetail(page);
    const bodies = recordRequestBodies<UpdateBody>(page, 'PUT', APPOINTMENT_PATH);

    await dialog.getByTestId('appointment-detail-edit').click();
    await dialog.locator('textarea').fill('Discarded by Escape');
    await page.keyboard.press('Escape');
    await expect(dialog.getByTestId('appointment-detail-edit')).toBeVisible();
    await expect(dialog.getByText('Detail task', { exact: true })).toBeVisible();

    await dialog.getByTestId('appointment-detail-edit').click();
    await dialog.locator('textarea').fill('Never confirmed');
    await dialog.getByTestId('appointment-detail-save').click();
    await page.getByRole('dialog', { name: 'Confirm save' }).getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('dialog', { name: 'Confirm save' })).toHaveCount(0);
    expect(bodies).toHaveLength(0);
    expect(state.appointments[0]?.taskDescription).toBe('Detail task');
  });
});

test.describe('Scheduler status change confirmation', () => {
  test('names the new status, Cancel keeps the old one and confirming changes it everywhere', async ({ page }) => {
    const { scheduler, dialog } = await openDetail(page);
    const confirm = page.getByRole('dialog', { name: 'Confirm status change' });
    const trigger = dialog.getByRole('combobox', { name: 'Change appointment status' });

    await scheduler.changeAppointmentStatus('Cancelled');
    await expect(confirm).toContainText('Change appointment status to Cancelled?');
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toHaveCount(0);
    await expect(trigger).toContainText('In progress');

    await scheduler.changeAppointmentStatus('Cancelled');
    await confirm.getByRole('button', { name: 'Change status' }).click();

    await expect(toastMessage(page, 'Appointment status updated successfully.')).toBeVisible();
    await expect(trigger).toContainText('Cancelled');
    await expect(dialog.getByTestId('appointment-status-badge')).toContainText('Cancelled');
    await expect(scheduler.cardFor('Detail task').getByTestId('appointment-status-badge')).toContainText('Cancelled');
  });
});
