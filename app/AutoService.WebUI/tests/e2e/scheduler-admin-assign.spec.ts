/** An admin adds mechanics to an appointment and removes them, but only while it is open; an admin never claims. */
import { expect, test } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import { selectDropdownOptionByLabel } from './support/dropdown';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS } from './support/test-data';
import { toastMessage } from './support/toast';

const { peter, mate } = MOCK_MECHANIC_IDS;

test.describe('Scheduler admin assignment', () => {
  test('offers every mechanic that is not assigned yet, adds one and removes another', async ({ page }) => {
    const state = await signInWithMocks(page, { isAdmin: true });
    seedAppointment(state, { id: 6601, task: 'Admin assigns', scheduledAt: todayAt(9), mechanicIds: [peter] });
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    await expect(scheduler.cardFor('Admin assigns').getByRole('button', { name: 'Claim', exact: true })).toHaveCount(0);
    const dialog = await scheduler.openFirstAppointmentDetail();
    const addButton = dialog.getByRole('button', { name: 'Add mechanic' });
    const picker = dialog.getByRole('combobox', { name: 'Select a mechanic...' });

    await expect(addButton).toBeDisabled();
    await picker.click();
    await expect(page.getByRole('option')).toHaveCount(3);
    const offered = await page.getByRole('option').allTextContents();
    expect([...offered].sort()).toEqual(['Admin Mechanic', 'Gabor Kovacs', 'Mate Szabo']);
    await page.keyboard.press('Escape');

    await selectDropdownOptionByLabel(page, picker, 'Mate Szabo');
    await expect(addButton).toBeEnabled();
    await addButton.click();
    await expect(toastMessage(page, 'Mechanic assigned successfully.')).toBeVisible();
    await expect(dialog.getByText('Mate Szabo', { exact: true })).toBeVisible();
    await expect(addButton).toBeDisabled();
    expect(state.appointments[0]?.mechanics.map((mechanic) => mechanic.id)).toEqual([peter, mate]);

    const removeButtons = dialog.getByRole('button', { name: 'Unassign mechanic' });
    await expect(removeButtons).toHaveCount(2);
    await removeButtons.first().click();
    await expect(toastMessage(page, 'Mechanic removed successfully.')).toBeVisible();
    await expect(dialog.getByText('Peter Nagy', { exact: true })).toHaveCount(0);
    await expect(removeButtons).toHaveCount(1);
    await expect(removeButtons).toBeDisabled();
    expect(state.appointments[0]?.mechanics.map((mechanic) => mechanic.id)).toEqual([mate]);
  });

  test('says that nobody is assigned to a fresh intake', async ({ page }) => {
    const state = await signInWithMocks(page, { isAdmin: true });
    seedAppointment(state, { id: 6602, task: 'Nobody yet', scheduledAt: todayAt(9) });
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();

    const dialog = await scheduler.openFirstAppointmentDetail();

    await expect(dialog.getByText('No mechanics assigned')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add mechanic' })).toBeDisabled();
  });

  for (const status of ['Cancelled', 'Completed'] as const) {
    test(`offers no add or remove action on a ${status} appointment`, async ({ page }) => {
      const state = await signInWithMocks(page, { isAdmin: true });
      seedAppointment(state, { id: 6603, status, task: 'Closed one', scheduledAt: todayAt(9), mechanicIds: [peter, mate] });
      const scheduler = new SchedulerPage(page);
      await scheduler.goto();

      const dialog = await scheduler.openFirstAppointmentDetail();

      await expect(dialog.getByText('Peter Nagy', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Mate Szabo', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Add mechanic')).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: /Unassign/ })).toHaveCount(0);
    });
  }
});
