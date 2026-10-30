/** What the user is told when the API refuses a status change, an edit, a delete or an assignment of an appointment. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import { refuseApiRoute } from './support/appointment-route-overrides';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

const { peter, mate } = MOCK_MECHANIC_IDS;
const APPOINTMENT_ID = 6701;

interface Refusal {
  readonly name: string;
  readonly status: number;
  readonly body: unknown;
  readonly message: string;
}

/** Signs in as an admin with one open appointment of Peter and Mate and opens its detail dialog. */
async function openDetail(page: Page): Promise<{ scheduler: SchedulerPage; dialog: Locator }> {
  const state = await signInWithMocks(page, { isAdmin: true });
  seedAppointment(state, { id: APPOINTMENT_ID, task: 'Refusal task', scheduledAt: todayAt(9), mechanicIds: [peter, mate] });
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();

  return { scheduler, dialog: await scheduler.openFirstAppointmentDetail() };
}

const STATUS_REFUSALS: readonly Refusal[] = [
  {
    name: 'a completion without an accepted quote',
    status: 409,
    body: { code: 'appointment_completion_requires_accepted_quote' },
    message: 'Cannot complete: the appointment needs an accepted quote.',
  },
  {
    name: 'a change of a completed appointment',
    status: 409,
    body: { code: 'appointment_completed_terminal' },
    message: 'A completed appointment cannot be changed.',
  },
  { name: 'any other refusal', status: 400, body: {}, message: 'Failed to update status.' },
];

const DELETE_REFUSALS: readonly Refusal[] = [
  {
    name: 'a completed appointment',
    status: 409,
    body: { code: 'appointment_completed_terminal' },
    message: 'A completed appointment cannot be deleted.',
  },
  { name: 'an appointment that is gone', status: 404, body: { code: 'appointment_not_found' }, message: 'Failed to delete appointment.' },
];

test.describe('Scheduler refused status changes', () => {
  for (const refusal of STATUS_REFUSALS) {
    test(`tells the reason for ${refusal.name}`, async ({ page }) => {
      const { scheduler } = await openDetail(page);
      await refuseApiRoute(page, `/api/appointments/${String(APPOINTMENT_ID)}/status`, 'PUT', refusal.status, refusal.body);

      await scheduler.changeAppointmentStatus('Cancelled');
      await page.getByRole('dialog', { name: 'Confirm status change' }).getByRole('button', { name: 'Change status' }).click();

      await expect(errorToastMessage(page, refusal.message)).toBeVisible();
      await expect(toastMessage(page, 'Appointment status updated successfully.')).toHaveCount(0);
    });
  }
});

test.describe('Scheduler refused deletes', () => {
  for (const refusal of DELETE_REFUSALS) {
    test(`tells the reason for ${refusal.name}`, async ({ page }) => {
      const { scheduler } = await openDetail(page);
      await refuseApiRoute(page, `/api/appointments/${String(APPOINTMENT_ID)}`, 'DELETE', refusal.status, refusal.body);

      await scheduler.deleteButton().click();
      await page.getByRole('dialog', { name: 'Confirm appointment deletion' }).getByRole('button', { name: 'Delete appointment' }).click();

      await expect(errorToastMessage(page, refusal.message)).toBeVisible();
    });
  }
});

test.describe('Scheduler refused edits and assignments', () => {
  test('a refused edit toasts the failure', async ({ page }) => {
    const { dialog } = await openDetail(page);
    await refuseApiRoute(page, `/api/appointments/${String(APPOINTMENT_ID)}`, 'PUT', 400, {});

    await dialog.getByTestId('appointment-detail-edit').click();
    await dialog.locator('textarea').fill('Edited task');
    await dialog.getByTestId('appointment-detail-save').click();
    await page.getByRole('dialog', { name: 'Confirm save' }).getByRole('button', { name: 'Save', exact: true }).click();

    await expect(errorToastMessage(page, 'Failed to save appointment changes.')).toBeVisible();
  });

  test('a refused assignment toasts the failure', async ({ page }) => {
    const { dialog } = await openDetail(page);
    await refuseApiRoute(page, /^\/api\/appointments\/6701\/assign\/\d+$/, 'PUT', 409, { code: 'already_assigned' });

    await dialog.getByRole('combobox', { name: 'Select a mechanic...' }).click();
    await page.getByRole('option', { name: 'Gabor Kovacs' }).click();
    await dialog.getByRole('button', { name: 'Add mechanic' }).click();

    await expect(errorToastMessage(page, 'Failed to assign mechanic.')).toBeVisible();
  });

  test('a refused removal toasts the failure', async ({ page }) => {
    const { dialog } = await openDetail(page);
    await refuseApiRoute(page, /^\/api\/appointments\/6701\/assign\/\d+$/, 'DELETE', 422, { code: 'last_assigned_mechanic' });

    await dialog.getByRole('button', { name: 'Unassign mechanic' }).first().click();

    await expect(errorToastMessage(page, 'Failed to remove mechanic.')).toBeVisible();
  });
});
