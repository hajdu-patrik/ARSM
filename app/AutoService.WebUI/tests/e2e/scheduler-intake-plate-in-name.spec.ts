/** Scheduler intake: a plate typed into the name field keeps the customers the server found by that plate. */
import { expect, test } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { signInWithMocks } from './support/sign-in';

test.describe('Scheduler intake - plate typed in the name field', () => {
  test('lists the customer whose plate matches the typed text', async ({ page }) => {
    const state = await signInWithMocks(page);
    state.schedulerLookupCustomers.push({
      id: 106,
      firstName: 'Vera',
      middleName: null,
      lastName: 'Nova',
      email: 'vera.nova@example.test',
      phoneNumber: null,
      vehicles: [{
        id: 2601,
        licensePlate: 'PRB001',
        vin: 'WVWZZZAUZJW000601',
        brand: 'Skoda',
        model: 'Fabia',
        year: 2020,
        mileageKm: 15000,
        enginePowerKw: 90,
        drivetrainType: 'Diesel',
      }],
    });
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    const dialog = await scheduler.openIntakeForCurrentDay();

    await scheduler.searchByName('PRB001');

    await expect(dialog.getByText('1 matching customer', { exact: true })).toBeVisible();
    await expect(dialog.getByText('vera.nova@example.test', { exact: true })).toBeVisible();
    await expect(dialog.getByText('No customers match this name')).toHaveCount(0);
  });
});
