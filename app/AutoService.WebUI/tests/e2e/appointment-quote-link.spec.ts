import { expect, test } from '@playwright/test';
import type { AppointmentStatus } from '../../src/types/scheduler/scheduler.types';
import { ANNA_VEHICLE_ROW, CustomersPage } from './pages/customers.page';
import { QuotesPage } from './pages/quotes.page';
import { SchedulerPage } from './pages/scheduler.page';
import { DAY_MS, seedAppointment } from './support/appointment-fixtures';
import { signInWithMocks } from './support/sign-in';
import { MOCK_CUSTOMER_IDS, MOCK_QUOTE_IDS } from './support/test-data';
import { MOCK_APPOINTMENT_IDS } from './support/test-data.constants';
import type { MockApiState } from './support/test-data';

const OVERDUE_TONE = /text-arsm-error-text/;
const SUCCESS_TONE = /text-ui-success-text/;
const TODAY_APPOINTMENT_ID = 6101;
const LINKED_QUOTE_TITLE = 'Timing belt replacement';

/** Adds an appointment scheduled now that fell due 30 days ago, in the given status. */
function addOverdueTodayAppointment(state: MockApiState, status: AppointmentStatus): void {
  seedAppointment(state, { id: TODAY_APPOINTMENT_ID, status, dueAt: new Date(Date.now() - 30 * DAY_MS) });
}

/** Links the draft fixture quote to the given appointment, like a quote created from it. */
function linkDraftQuoteTo(state: MockApiState, appointmentId: number): void {
  const quote = state.quotes.find((candidate) => candidate.id === MOCK_QUOTE_IDS.draftTimingBelt);
  if (quote === undefined) {
    throw new Error('The fixture draft quote is missing.');
  }

  quote.appointmentId = appointmentId;
}

test.describe('Appointment - due state and quote link', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('a completed appointment shows Completed instead of an overdue time, and opens its quote', async ({ page }) => {
    const state = await signInWithMocks(page);
    addOverdueTodayAppointment(state, 'Completed');
    linkDraftQuoteTo(state, TODAY_APPOINTMENT_ID);
    const schedulerPage = new SchedulerPage(page);

    await schedulerPage.goto();
    const dialog = await schedulerPage.openFirstAppointmentDetail();

    const dueLabel = dialog.locator('p', { hasText: /^Completed$/ });
    await expect(dueLabel).toHaveClass(SUCCESS_TONE);
    await expect(dialog).not.toContainText(/Overdue by/);

    await dialog.getByTestId('appointment-detail-open-quote').click();

    await expect(page).toHaveURL(/\/quotes$/);
    const editor = new QuotesPage(page).editorDialog();
    await expect(editor.getByTestId('quote-title-input')).toHaveValue(LINKED_QUOTE_TITLE);
  });

  test('a cancelled appointment shows Cancelled in the error tone', async ({ page }) => {
    const state = await signInWithMocks(page);
    addOverdueTodayAppointment(state, 'Cancelled');
    const schedulerPage = new SchedulerPage(page);

    await schedulerPage.goto();
    const dialog = await schedulerPage.openFirstAppointmentDetail();

    const dueLabel = dialog.locator('p', { hasText: /^Cancelled$/ });
    await expect(dueLabel).toHaveClass(OVERDUE_TONE);
    await expect(dialog).not.toContainText(/Overdue by/);
  });

  test('an open appointment past its due date keeps the overdue time, and has no quote button without a quote', async ({ page }) => {
    const state = await signInWithMocks(page);
    addOverdueTodayAppointment(state, 'InProgress');
    const schedulerPage = new SchedulerPage(page);

    await schedulerPage.goto();
    const dialog = await schedulerPage.openFirstAppointmentDetail();

    await expect(dialog.getByText(/Overdue by 30 days/)).toHaveClass(OVERDUE_TONE);
    await expect(dialog.getByTestId('appointment-detail-open-quote')).toHaveCount(0);
  });

  test('the customer history appointment opens its quote in the quote editor', async ({ page }) => {
    const state = await signInWithMocks(page);
    linkDraftQuoteTo(state, MOCK_APPOINTMENT_IDS.hybridInspection);
    const customersPage = new CustomersPage(page);

    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);
    await customersPage.openVehicleDetails(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);
    await customersPage.detailsPanel().getByRole('button', { name: /Hybrid system inspection/ }).click();

    const historyDialog = page.getByRole('dialog', { name: 'Appointment history details' });
    await historyDialog.getByRole('button', { name: 'Open quote' }).click();

    await expect(page).toHaveURL(/\/quotes$/);
    const editor = new QuotesPage(page).editorDialog();
    await expect(editor.getByTestId('quote-title-input')).toHaveValue(LINKED_QUOTE_TITLE);
  });

  test('the customer history appointment has no quote button when no quote is linked', async ({ page }) => {
    await signInWithMocks(page);
    const customersPage = new CustomersPage(page);

    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);
    await customersPage.openVehicleDetails(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);
    await customersPage.detailsPanel().getByRole('button', { name: /Hybrid system inspection/ }).click();

    const historyDialog = page.getByRole('dialog', { name: 'Appointment history details' });
    await expect(historyDialog).toBeVisible();
    await expect(historyDialog.getByRole('button', { name: 'Open quote' })).toHaveCount(0);
  });
});
