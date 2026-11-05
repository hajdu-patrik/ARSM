/** Customer and vehicle repair history in the details panel: the newest-first read behind the 500-row cap, sort
 * direction, a failed read, and the appointment dialog (task, status, timestamps, vehicle) with its scheduler shortcut. */
import { expect, test, type Page } from '@playwright/test';
import type { AppointmentDto } from '../../src/types/scheduler/scheduler.types';
import { ANNA_VEHICLE_ROW, CustomersPage } from './pages/customers.page';
import { recordGetRequests } from './support/request-log';
import { MOCK_CUSTOMER_IDS, MOCK_VEHICLE_IDS, type MockApiState } from './support/test-data';
import { errorToastMessage } from './support/toast';

test.use({ viewport: { width: 1280, height: 1000 } });

const ANNA = MOCK_CUSTOMER_IDS.anna;
const HISTORY_DIALOG = 'Appointment history details';
/** One more than the API's 500-row cap, so the oldest two rows are the ones the cap cuts. */
const OVER_CAP_COUNT = 502;
const API_CAP = 500;

/** A history of `count` appointments, oldest first, named `History job 1` (oldest) to `History job <count>` (newest). */
function buildLongHistory(template: AppointmentDto, count: number): AppointmentDto[] {
  return Array.from({ length: count }, (_, index) => ({
    ...template,
    id: 7000 + index,
    scheduledDate: new Date(Date.UTC(2024, 0, 1 + index, 9)).toISOString(),
    taskDescription: `History job ${String(index + 1)}`,
  }));
}

/** The exact task text of one numbered job. */
function job(number: number): string {
  return `History job ${String(number)}`;
}

/** Puts an older, cancelled appointment before the fixture one, as the API returns a history: oldest first. */
function addOlderCancelledAppointment(state: MockApiState): void {
  const history = state.customerHistoryByCustomerId[ANNA];
  const template = history?.[0];
  if (history === undefined || template === undefined) {
    throw new Error('The fixture history appointment is missing.');
  }

  const older: AppointmentDto = {
    ...template,
    id: 5002,
    scheduledDate: '2026-03-02T08:00:00.000Z',
    intakeCreatedAt: '2026-03-01T08:00:00.000Z',
    dueDateTime: '2026-03-05T17:00:00.000Z',
    taskDescription: 'Brake service',
    status: 'Cancelled',
    completedAt: null,
    canceledAt: '2026-03-03T10:00:00.000Z',
  };
  history.unshift(older);
}

/** Opens the customers page with Anna's history (one extra cancelled job) expanded. */
async function openAnnaHistory(page: Page): Promise<CustomersPage> {
  const { customersPage, state } = await CustomersPage.open(page);
  addOlderCancelledAppointment(state);
  await customersPage.expandCustomer(ANNA);

  return customersPage;
}

test.describe('Customer repair history', () => {
  test('lists the oldest first and reverses on the sort button, both ways', async ({ page }) => {
    const customersPage = await openAnnaHistory(page);
    const panel = customersPage.detailsPanel();
    const rows = panel.getByRole('button').filter({ hasText: /Brake service|Hybrid system inspection/ });

    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Brake service');
    await expect(rows.nth(1)).toContainText('Hybrid system inspection');

    await panel.getByRole('button', { name: 'Oldest first' }).click();
    await expect(rows.nth(0)).toContainText('Hybrid system inspection');
    await expect(rows.nth(1)).toContainText('Brake service');

    await panel.getByRole('button', { name: 'Newest first' }).click();
    await expect(rows.nth(0)).toContainText('Brake service');
  });

  test('a completed appointment shows its completion time and no cancellation time', async ({ page }) => {
    const customersPage = await openAnnaHistory(page);

    await customersPage.detailsPanel().getByRole('button', { name: /Hybrid system inspection/ }).click();

    const dialog = page.getByRole('dialog', { name: HISTORY_DIALOG });
    await expect(dialog).toContainText('Hybrid system inspection');
    await expect(dialog).toContainText('Completed');
    await expect(dialog.getByText('Intake created at')).toBeVisible();
    await expect(dialog.getByText('Due date')).toBeVisible();
    await expect(dialog.getByText('Completed at')).toBeVisible();
    await expect(dialog.getByText('Cancelled at')).toHaveCount(0);
    await expect(dialog).toContainText('Volkswagen Golf (2018)');
    await expect(dialog).toContainText('NXE-441');
  });

  test('a cancelled appointment shows its cancellation time and no completion time', async ({ page }) => {
    const customersPage = await openAnnaHistory(page);

    await customersPage.detailsPanel().getByRole('button', { name: /Brake service/ }).click();

    const dialog = page.getByRole('dialog', { name: HISTORY_DIALOG });
    await expect(dialog).toContainText('Brake service');
    await expect(dialog).toContainText('Cancelled');
    await expect(dialog.getByText('Cancelled at')).toBeVisible();
    await expect(dialog.getByText('Completed at')).toHaveCount(0);
  });

  test('the shortcut closes the dialog and opens the scheduler', async ({ page }) => {
    const customersPage = await openAnnaHistory(page);
    await customersPage.detailsPanel().getByRole('button', { name: /Hybrid system inspection/ }).click();
    const dialog = page.getByRole('dialog', { name: HISTORY_DIALOG });

    await dialog.getByRole('button', { name: 'Open appointment in scheduler' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
    await expect(dialog).toHaveCount(0);
  });

  test('Escape closes the dialog and keeps the history panel', async ({ page }) => {
    const customersPage = await openAnnaHistory(page);
    await customersPage.detailsPanel().getByRole('button', { name: /Brake service/ }).click();
    const dialog = page.getByRole('dialog', { name: HISTORY_DIALOG });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(dialog).toHaveCount(0);
    await customersPage.expectCustomerHistoryPanel();
  });
});

test.describe('Repair history over the 500-row cap', () => {
  test('the customer history asks for the newest rows and keeps both sort directions right', async ({ page }) => {
    const { customersPage, state } = await CustomersPage.open(page);
    const template = state.customerHistoryByCustomerId[ANNA]?.[0];
    if (template === undefined) {
      throw new Error('The fixture history appointment is missing.');
    }
    state.customerHistoryByCustomerId[ANNA] = buildLongHistory(template, OVER_CAP_COUNT);
    const reads = recordGetRequests(page, `/api/customers/${String(ANNA)}/appointments`);

    await customersPage.expandCustomer(ANNA);
    const panel = customersPage.detailsPanel();
    const rows = panel.getByRole('button').filter({ hasText: /History job/ });

    await expect(rows).toHaveCount(API_CAP);
    expect(reads.map((url) => url.searchParams.get('descending'))).toEqual(['true']);
    await expect(rows.first().getByText(job(OVER_CAP_COUNT - API_CAP + 1), { exact: true })).toHaveCount(1);
    await expect(rows.last().getByText(job(OVER_CAP_COUNT), { exact: true })).toHaveCount(1);
    await expect(panel.getByText(job(1), { exact: true })).toHaveCount(0);

    await panel.getByRole('button', { name: 'Oldest first' }).click();
    await expect(rows.first().getByText(job(OVER_CAP_COUNT), { exact: true })).toHaveCount(1);
    await expect(rows.last().getByText(job(OVER_CAP_COUNT - API_CAP + 1), { exact: true })).toHaveCount(1);
  });

  test('the vehicle history asks for the newest rows and keeps both sort directions right', async ({ page }) => {
    const { customersPage, state } = await CustomersPage.open(page);
    const template = state.vehicleHistoryByVehicleId[MOCK_VEHICLE_IDS.annaNxe441]?.[0];
    if (template === undefined) {
      throw new Error('The fixture vehicle history appointment is missing.');
    }
    state.vehicleHistoryByVehicleId[MOCK_VEHICLE_IDS.annaNxe441] = buildLongHistory(template, OVER_CAP_COUNT);
    const reads = recordGetRequests(page, `/api/vehicles/${String(MOCK_VEHICLE_IDS.annaNxe441)}/appointments`);

    await customersPage.expandCustomer(ANNA);
    await customersPage.openVehicleDetails(ANNA, ANNA_VEHICLE_ROW.nxe441);
    const panel = customersPage.detailsPanel();
    const rows = panel.getByRole('button').filter({ hasText: /History job/ });

    await expect(rows).toHaveCount(API_CAP);
    expect(reads.map((url) => url.searchParams.get('descending'))).toEqual(['true']);
    await expect(rows.first().getByText(job(OVER_CAP_COUNT - API_CAP + 1), { exact: true })).toHaveCount(1);
    await expect(rows.last().getByText(job(OVER_CAP_COUNT), { exact: true })).toHaveCount(1);

    await panel.getByRole('button', { name: 'Oldest first' }).click();
    await expect(rows.first().getByText(job(OVER_CAP_COUNT), { exact: true })).toHaveCount(1);
  });
});

test.describe('Customer repair history failure', () => {
  test('toasts a failed read and shows the empty note instead of a list', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page, { failedCustomerHistoryIds: [ANNA] });

    await customersPage.expandCustomer(ANNA);

    await expect(errorToastMessage(page, 'Failed to load repair history.')).toBeVisible();
    await expect(customersPage.detailsPanel()).toContainText('No repair history found for this customer.');
  });
});
