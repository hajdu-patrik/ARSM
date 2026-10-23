/** The appointment status control follows the server flags: Completed needs an accepted quote and is terminal. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { AppointmentDto, AppointmentStatus } from '../../src/types/scheduler/scheduler.types';
import { SchedulerPage } from './pages/scheduler.page';
import { signInWithMocks } from './support/sign-in';
import { MOCK_CUSTOMER_IDS, MOCK_QUOTE_IDS } from './support/test-data';
import type { MockApiState } from './support/test-data';
import { toastMessage } from './support/toast';

const DAY_MS = 24 * 60 * 60 * 1000;
const LIFECYCLE_APPOINTMENT_ID = 6201;
const ACCEPTED_QUOTE_ID = 7201;

/** Adds an appointment scheduled now, in the given status, built from the fixture history appointment. */
function addAppointment(state: MockApiState, status: AppointmentStatus): void {
  const template = state.customerHistoryByCustomerId[MOCK_CUSTOMER_IDS.anna]?.[0];
  if (template === undefined) {
    throw new Error('The fixture history appointment is missing.');
  }

  const now = Date.now();
  const appointment: AppointmentDto = {
    ...template,
    id: LIFECYCLE_APPOINTMENT_ID,
    scheduledDate: new Date(now).toISOString(),
    dueDateTime: new Date(now + DAY_MS).toISOString(),
    status,
    completedAt: status === 'Completed' ? new Date(now).toISOString() : null,
    canceledAt: status === 'Cancelled' ? new Date(now).toISOString() : null,
  };

  state.appointments.push(appointment);
}

/** Adds an accepted quote linked to the lifecycle appointment, cloned from the fixture draft quote. */
function addAcceptedQuote(state: MockApiState): void {
  const template = state.quotes.find((candidate) => candidate.id === MOCK_QUOTE_IDS.draftTimingBelt);
  if (template === undefined) {
    throw new Error('The fixture draft quote is missing.');
  }

  state.quotes.push({ ...template, id: ACCEPTED_QUOTE_ID, status: 'Accepted', appointmentId: LIFECYCLE_APPOINTMENT_ID });
}

function statusTrigger(dialog: Locator): Locator {
  return dialog.getByRole('combobox', { name: 'Change appointment status' });
}

/** Opens the status list and returns the Completed option; the caller closes the list. */
async function openCompletedOption(page: Page, dialog: Locator): Promise<Locator> {
  await statusTrigger(dialog).click();
  const option = page.getByRole('option', { name: 'Completed', exact: true });
  await expect(option).toBeVisible();
  return option;
}

async function openDetail(page: Page): Promise<Locator> {
  const schedulerPage = new SchedulerPage(page);
  await schedulerPage.goto();
  return schedulerPage.openFirstAppointmentDetail();
}

test.describe('Scheduler - appointment lifecycle rules', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('Completed is not offered without an accepted quote and the reason is shown', async ({ page }) => {
    const state = await signInWithMocks(page, { isAdmin: true });
    addAppointment(state, 'InProgress');
    const dialog = await openDetail(page);

    await expect(dialog.getByTestId('appointment-detail-complete-hint')).toBeVisible();

    const completedOption = await openCompletedOption(page, dialog);
    await expect(completedOption).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
  });

  test('Completed is offered once an accepted quote exists, and completing it works', async ({ page }) => {
    const state = await signInWithMocks(page, { isAdmin: true });
    addAppointment(state, 'InProgress');
    addAcceptedQuote(state);
    const schedulerPage = new SchedulerPage(page);
    const dialog = await openDetail(page);

    await expect(dialog.getByTestId('appointment-detail-complete-hint')).toHaveCount(0);

    const completedOption = await openCompletedOption(page, dialog);
    await expect(completedOption).not.toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();

    await schedulerPage.changeAppointmentStatus('Completed');
    await page.getByRole('dialog', { name: /Confirm status change/i }).getByRole('button', { name: 'Change status' }).click();

    await expect(toastMessage(page, 'Appointment status updated successfully.')).toBeVisible();
  });

  test('a Completed appointment has no status control and no delete button', async ({ page }) => {
    const state = await signInWithMocks(page, { isAdmin: true });
    addAppointment(state, 'Completed');
    addAcceptedQuote(state);
    const dialog = await openDetail(page);

    await expect(statusTrigger(dialog)).toHaveCount(0);
    await expect(dialog.getByTestId('appointment-detail-complete-hint')).toHaveCount(0);
    await expect(new SchedulerPage(page).deleteButton()).toHaveCount(0);
  });

  test('a Cancelled appointment can be moved back to in progress', async ({ page }) => {
    const state = await signInWithMocks(page, { isAdmin: true });
    addAppointment(state, 'Cancelled');
    const schedulerPage = new SchedulerPage(page);
    await openDetail(page);

    await schedulerPage.changeAppointmentStatus('In progress');
    await page.getByRole('dialog', { name: /Confirm status change/i }).getByRole('button', { name: 'Change status' }).click();

    await expect(toastMessage(page, 'Appointment status updated successfully.')).toBeVisible();
    await expect(statusTrigger(schedulerPage.detailDialog())).toContainText('In progress');
  });
});
