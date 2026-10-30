/** The `/customers?vehicleId=<id>` link opens the vehicle editor once; an unusable id is dropped without a
 * vehicle read, and the editor saves like the one opened from a tile. */
import { expect, test } from '@playwright/test';
import { CustomersPage } from './pages/customers.page';
import { MOCK_VEHICLE_IDS } from './support/test-data';
import { toastMessage } from './support/toast';

test.use({ viewport: { width: 1280, height: 1000 } });

const UNUSABLE_IDS = ['abc', '0', '-3', '1.5'] as const;

for (const unusable of UNUSABLE_IDS) {
  test(`drops the unusable vehicleId "${unusable}" without reading a vehicle or opening a dialog`, async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const vehicleReads: string[] = [];
    page.on('request', (request) => {
      const { pathname } = new URL(request.url());
      if (pathname.startsWith('/api/vehicles/')) {
        vehicleReads.push(pathname);
      }
    });

    await page.goto(`/customers?vehicleId=${unusable}`);

    await expect(customersPage.searchInput()).toBeVisible();
    await expect(page).toHaveURL(/\/customers$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(vehicleReads).toEqual([]);
  });
}

test('the editor opened by the link saves the vehicle and the link is consumed', async ({ page }) => {
  const { customersPage } = await CustomersPage.open(page);

  await page.goto(`/customers?vehicleId=${String(MOCK_VEHICLE_IDS.annaNxe441)}`);
  const dialog = customersPage.vehicleDialog('Edit vehicle');
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/customers$/);
  await expect(dialog.getByLabel('License plate')).toHaveValue('NXE-441');

  await dialog.getByLabel('Mileage (km)').fill('130000');
  const request = page.waitForRequest((candidate) => candidate.method() === 'PUT' && new URL(candidate.url()).pathname === `/api/vehicles/${String(MOCK_VEHICLE_IDS.annaNxe441)}`);
  await dialog.getByRole('button', { name: 'Save' }).click();

  expect((await request).postDataJSON()).toMatchObject({ licensePlate: 'NXE-441', mileageKm: 130000 });
  await expect(toastMessage(page, 'Vehicle updated successfully.')).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/customers$/);
});
