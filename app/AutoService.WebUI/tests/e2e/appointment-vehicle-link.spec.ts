import { expect, test } from '@playwright/test';
import type { AppointmentDto } from '../../src/types/scheduler/scheduler.types';
import { CustomersPage } from './pages/customers.page';
import { SchedulerPage } from './pages/scheduler.page';
import { signInWithMocks } from './support/sign-in';
import { MOCK_VEHICLE_IDS } from './support/test-data.constants';
import { MOCK_CUSTOMER_IDS, type MockApiState } from './support/test-data';

const UNKNOWN_VEHICLE_ID = 987654;

/** Adds a cancelled appointment scheduled now for the fixture history vehicle (Anna's Golf). */
function addCancelledTodayAppointment(state: MockApiState): void {
  const template = state.customerHistoryByCustomerId[MOCK_CUSTOMER_IDS.anna]?.[0];
  if (template === undefined) {
    throw new Error('The fixture history appointment is missing.');
  }

  const now = new Date().toISOString();
  const appointment: AppointmentDto = {
    ...template,
    id: 6102,
    scheduledDate: now,
    status: 'Cancelled',
    completedAt: null,
    canceledAt: now,
  };

  state.appointments.push(appointment);
}

test.describe('Appointment - vehicle edit link', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('a cancelled appointment opens its vehicle prefilled in the Customers vehicle editor', async ({ page }) => {
    const state = await signInWithMocks(page);
    addCancelledTodayAppointment(state);
    const schedulerPage = new SchedulerPage(page);

    await schedulerPage.goto();
    const detail = await schedulerPage.openFirstAppointmentDetail();
    await expect(detail.getByText('Cancelled', { exact: true }).first()).toBeVisible();

    await detail.getByTestId('appointment-detail-edit-vehicle').click();

    await expect(page).toHaveURL(/\/customers$/);
    const editor = new CustomersPage(page).vehicleDialog('Edit vehicle');
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel('License plate')).toHaveValue('NXE-441');
    await expect(editor.getByLabel('VIN')).toHaveValue('WVWZZZAUZJW123456');
    await expect(editor.getByLabel('Brand')).toHaveValue('Volkswagen');
    await expect(editor.getByLabel('Model')).toHaveValue('Golf');
  });

  test('a known vehicleId opens the editor and an unknown one opens nothing', async ({ page }) => {
    await signInWithMocks(page);
    const customersPage = new CustomersPage(page);

    await page.goto(`/customers?vehicleId=${String(UNKNOWN_VEHICLE_ID)}`);
    await expect(customersPage.searchInput()).toBeVisible();
    await expect(page).toHaveURL(/\/customers$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.goto(`/customers?vehicleId=${String(MOCK_VEHICLE_IDS.annaNxe441)}`);
    await expect(customersPage.vehicleDialog('Edit vehicle')).toBeVisible();
    await expect(page).toHaveURL(/\/customers$/);
  });
});
