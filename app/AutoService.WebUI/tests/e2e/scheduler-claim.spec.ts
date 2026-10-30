/** A mechanic claims an open appointment and leaves it again, from the card and from the detail dialog,
 * and sees the controls only where they apply. */
import { expect, test, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS, type MockApiState } from './support/test-data';
import { toastMessage } from './support/toast';

const { gabor, peter } = MOCK_MECHANIC_IDS;
const CLAIM = { name: 'Claim', exact: true } as const;
const LEAVE = { name: 'Unassign me', exact: true } as const;

async function openScheduler(page: Page, seed: (state: MockApiState) => void): Promise<SchedulerPage> {
  const state = await signInWithMocks(page);
  seed(state);
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();

  return scheduler;
}

test.describe('Scheduler claim from the card', () => {
  test('claims after the confirmation and leaves again after a second one', async ({ page }) => {
    const scheduler = await openScheduler(page, (state) => {
      seedAppointment(state, { id: 6501, task: 'Claim me', scheduledAt: todayAt(9), mechanicIds: [peter] });
    });
    const card = scheduler.cardFor('Claim me');
    const claimDialog = page.getByRole('dialog', { name: 'Confirm claim' });

    await card.getByRole('button', CLAIM).click();
    await expect(claimDialog).toContainText('Are you sure you want to claim this appointment?');
    await claimDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(claimDialog).toHaveCount(0);
    await expect(card.getByRole('button', LEAVE)).toHaveCount(0);

    await card.getByRole('button', CLAIM).click();
    await claimDialog.getByRole('button', CLAIM).click();
    await expect(toastMessage(page, 'Appointment claimed successfully.')).toBeVisible();
    await expect(claimDialog).toHaveCount(0);
    await expect(card.getByRole('img', { name: 'Gabor Kovacs' })).toBeVisible();
    await expect(card.getByRole('button', CLAIM)).toHaveCount(0);

    const leaveDialog = page.getByRole('dialog', { name: 'Confirm unassign' });
    await card.getByRole('button', LEAVE).click();
    await expect(leaveDialog).toContainText('Are you sure you want to leave this appointment?');
    await leaveDialog.getByRole('button', { name: 'Unassign', exact: true }).click();
    await expect(toastMessage(page, 'You were unassigned successfully.')).toBeVisible();
    await expect(card.getByRole('img', { name: 'Gabor Kovacs' })).toHaveCount(0);
    await expect(card.getByRole('button', CLAIM)).toBeVisible();
  });

  test('offers neither claim nor unassign on a closed appointment or when the mechanic is the only one', async ({ page }) => {
    const scheduler = await openScheduler(page, (state) => {
      seedAppointment(state, { id: 6511, task: 'Only me', scheduledAt: todayAt(8), mechanicIds: [gabor] });
      seedAppointment(state, { id: 6512, status: 'Cancelled', task: 'Cancelled one', scheduledAt: todayAt(9), mechanicIds: [peter] });
      seedAppointment(state, { id: 6513, status: 'Completed', task: 'Done one', scheduledAt: todayAt(10), mechanicIds: [peter] });
      seedAppointment(state, { id: 6514, task: 'Open other', scheduledAt: todayAt(11), mechanicIds: [peter] });
    });

    await expect(scheduler.cardFor('Open other').getByRole('button', CLAIM)).toBeVisible();
    for (const task of ['Only me', 'Cancelled one', 'Done one']) {
      await expect(scheduler.cardFor(task).getByRole('button', CLAIM)).toHaveCount(0);
      await expect(scheduler.cardFor(task).getByRole('button', LEAVE)).toHaveCount(0);
    }
  });
});

test.describe('Scheduler claim from the detail dialog', () => {
  test('claims and unassigns in the dialog, which lists the mechanics', async ({ page }) => {
    const scheduler = await openScheduler(page, (state) => {
      seedAppointment(state, { id: 6521, task: 'Detail claim', scheduledAt: todayAt(9), mechanicIds: [peter] });
    });
    const dialog = await scheduler.openFirstAppointmentDetail();

    await expect(dialog.getByText('Peter Nagy', { exact: true })).toBeVisible();
    await dialog.getByRole('button', CLAIM).click();
    await page.getByRole('dialog', { name: 'Confirm claim' }).getByRole('button', CLAIM).click();
    await expect(toastMessage(page, 'Appointment claimed successfully.')).toBeVisible();
    await expect(dialog.getByText('Gabor Kovacs', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', CLAIM)).toHaveCount(0);

    await dialog.getByRole('button', LEAVE).click();
    await page.getByRole('dialog', { name: 'Confirm unassign' }).getByRole('button', { name: 'Unassign', exact: true }).click();
    await expect(toastMessage(page, 'You were unassigned successfully.')).toBeVisible();
    await expect(dialog.getByText('Gabor Kovacs', { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('button', CLAIM)).toBeVisible();
  });

  test('an assigned mechanic can edit and change the status but not add mechanics or delete', async ({ page }) => {
    const scheduler = await openScheduler(page, (state) => {
      seedAppointment(state, { id: 6531, task: 'Only me', scheduledAt: todayAt(9), mechanicIds: [gabor] });
    });
    const dialog = await scheduler.openFirstAppointmentDetail();

    await expect(dialog.getByTestId('appointment-detail-edit')).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: 'Change appointment status' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Unassign/ })).toHaveCount(0);
    await expect(dialog.getByText('Add mechanic')).toHaveCount(0);
    await expect(scheduler.deleteButton()).toHaveCount(0);
  });

  test('a mechanic who is not assigned sees the details without edit, status or delete controls', async ({ page }) => {
    const scheduler = await openScheduler(page, (state) => {
      seedAppointment(state, { id: 6541, task: 'Not mine', scheduledAt: todayAt(9), mechanicIds: [peter] });
    });
    const dialog = await scheduler.openFirstAppointmentDetail();

    await expect(dialog.getByText('Not mine', { exact: true })).toBeVisible();
    await expect(dialog.getByTestId('appointment-detail-edit')).toHaveCount(0);
    await expect(dialog.getByRole('combobox')).toHaveCount(0);
    await expect(scheduler.deleteButton()).toHaveCount(0);
  });
});

test.describe('Scheduler claim in Hungarian', () => {
  test('words the confirmation and the outcome in Hungarian', async ({ page }) => {
    const state = await signInWithMocks(page, {}, 'hu');
    seedAppointment(state, { id: 6551, task: 'Igénylős feladat', scheduledAt: todayAt(9), mechanicIds: [peter] });
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();

    await scheduler.cardFor('Igénylős feladat').getByRole('button', { name: 'Igénylés', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Igénylés megerősítése' });
    await expect(dialog).toContainText('Biztosan igényli ezt az időpontot?');
    await dialog.getByRole('button', { name: 'Igénylés', exact: true }).click();

    await expect(toastMessage(page, 'Az időpont igénylése sikeres.')).toBeVisible();
    await expect(scheduler.cardFor('Igénylős feladat').getByRole('button', { name: 'Lejelentkezés', exact: true })).toBeVisible();
  });
});
