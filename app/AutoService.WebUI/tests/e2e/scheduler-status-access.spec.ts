/** Only a mechanic assigned to the appointment is offered the status control, an admin included: the API refuses
 * the status change of an admin who is not assigned with a 403, so the dialog does not offer it. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS } from './support/test-data';

const { admin, gabor, peter } = MOCK_MECHANIC_IDS;
const APPOINTMENT_ID = 6851;

/** Signs in (as an admin or as the plain mechanic Gabor), seeds one open appointment with the given mechanics and opens it. */
async function openDetail(page: Page, isAdmin: boolean, mechanicIds: readonly number[]): Promise<{ scheduler: SchedulerPage; dialog: Locator }> {
  const state = await signInWithMocks(page, { isAdmin });
  seedAppointment(state, { id: APPOINTMENT_ID, task: 'Status access job', scheduledAt: todayAt(9), mechanicIds });
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();

  return { scheduler, dialog: await scheduler.openFirstAppointmentDetail() };
}

function statusControl(dialog: Locator): Locator {
  return dialog.getByRole('combobox', { name: 'Change appointment status' });
}

test.describe('Scheduler status control access', () => {
  test('an admin who is not assigned sees no status control but keeps the edit and delete actions', async ({ page }) => {
    const { scheduler, dialog } = await openDetail(page, true, [peter]);

    await expect(dialog.getByText('Peter Nagy', { exact: true })).toBeVisible();
    await expect(dialog.getByTestId('appointment-detail-edit')).toBeVisible();
    await expect(scheduler.deleteButton()).toBeVisible();
    await expect(statusControl(dialog)).toHaveCount(0);
  });

  test('an admin who is not assigned to anybody sees no status control either', async ({ page }) => {
    const { dialog } = await openDetail(page, true, []);

    await expect(dialog.getByText('No mechanics assigned')).toBeVisible();
    await expect(statusControl(dialog)).toHaveCount(0);
  });

  test('an admin who is assigned to the appointment sees the status control', async ({ page }) => {
    const { dialog } = await openDetail(page, true, [peter, admin]);

    await expect(statusControl(dialog)).toBeVisible();
    await expect(statusControl(dialog)).toContainText('In progress');
  });

  test('an assigned mechanic sees the status control', async ({ page }) => {
    const { dialog } = await openDetail(page, false, [gabor]);

    await expect(statusControl(dialog)).toBeVisible();
    await expect(statusControl(dialog)).toContainText('In progress');
  });
});
