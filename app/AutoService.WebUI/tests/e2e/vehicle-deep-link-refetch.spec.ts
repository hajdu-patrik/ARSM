/** A vehicle editor opened through the `/customers?vehicleId=` link seeds from the freshly read vehicle: a copy
 * cached before an edit went stale, and the editor used to open on it before the refetch finished. */
import { expect, test, type Page } from '@playwright/test';
import { CustomersPage } from './pages/customers.page';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment } from './support/appointment-fixtures';
import { signInWithMocks } from './support/sign-in';
import { toastMessage } from './support/toast';

test.use({ viewport: { width: 1280, height: 1000 } });

const CACHED_MILEAGE = '124500';
const SAVED_MILEAGE = '130000';

/** Opens the first appointment's detail on the scheduler and follows its edit-vehicle link to the Customers page. */
async function followEditVehicleLink(page: Page, schedulerPage: SchedulerPage): Promise<void> {
  const detail = await schedulerPage.openFirstAppointmentDetail();
  await detail.getByTestId('appointment-detail-edit-vehicle').click();
  await expect(page).toHaveURL(/\/customers$/);
}

test('the editor opened by the link again shows the saved mileage, not the copy cached by the first visit', async ({ page }) => {
  const state = await signInWithMocks(page);
  seedAppointment(state, { id: 6102, status: 'Cancelled' });
  const schedulerPage = new SchedulerPage(page);
  const customersPage = new CustomersPage(page);
  await schedulerPage.goto();

  // First visit: the link reads the vehicle into the cache; saving it makes that copy stale.
  await followEditVehicleLink(page, schedulerPage);
  const firstEditor = customersPage.vehicleDialog('Edit vehicle');
  await expect(firstEditor.getByLabel('Mileage (km)')).toHaveValue(CACHED_MILEAGE);
  await firstEditor.getByLabel('Mileage (km)').fill(SAVED_MILEAGE);
  await firstEditor.getByRole('button', { name: 'Save' }).click();
  await expect(toastMessage(page, 'Vehicle updated successfully.')).toBeVisible();
  await expect(firstEditor).toHaveCount(0);

  // Second visit through the app, so the cache survives: the editor must wait for the refetch.
  await page.locator('aside:visible').getByRole('link', { name: 'Scheduler' }).click();
  await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
  await followEditVehicleLink(page, schedulerPage);

  const secondEditor = customersPage.vehicleDialog('Edit vehicle');
  await expect(secondEditor).toBeVisible();
  await expect(secondEditor.getByLabel('License plate')).toHaveValue('NXE-441');
  await expect(secondEditor.getByLabel('Mileage (km)')).toHaveValue(SAVED_MILEAGE);
});
