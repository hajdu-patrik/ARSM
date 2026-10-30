import { expect, test, type Locator, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { ANNA_VEHICLE_ROW, CustomersPage, ELECTRIC_AUDI } from './pages/customers.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks, type InstallApiMockOptions } from './support/api-mocks';
import { errorToastMessage } from './support/toast';
import { MOCK_CUSTOMER_IDS, MOCK_VEHICLE_IDS } from './support/test-data';

type CustomerRegistrySetupOptions = Pick<InstallApiMockOptions, 'failedVehicleHistoryIds'>;

// Tall enough that the page-size-by-height list shows all three fixture customers on page 1.
test.use({ viewport: { width: 1280, height: 1000 } });

/** Counts the pixels of the element's box that stand out from its top-left pixel, so an icon painted
 * over a plain field shows up and a field painted over the icon does not. */
async function countContrastPixels(page: Page, target: Locator): Promise<number> {
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error('The element has no layout box.');
  }

  const png = await page.screenshot({ clip: box });
  const scratch = await page.context().newPage();
  try {
    return await scratch.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (context === null) {
        return 0;
      }
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let offset = 0; offset < data.length; offset += 4) {
        const distance = [0, 1, 2].reduce((sum, channel) => sum + Math.abs((data[offset + channel] ?? 0) - (data[channel] ?? 0)), 0);
        count += distance > 60 ? 1 : 0;
      }
      return count;
    }, png.toString('base64'));
  } finally {
    await scratch.close();
  }
}

/** Prepares authenticated customer-registry state with optional repair-history failures. */
async function prepareCustomerRegistry(page: Page, options: CustomerRegistrySetupOptions = {}): Promise<void> {
  const env = getAppointmentFlowEnv();

  await installApiMocks(page, {
    profileEmail: env.mechanicEmail,
    ...options,
  });
  await new AuthPage(page).loginAsMechanic(env);
}

test.describe('Customer registry vehicle flows', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCustomerRegistry(page);
  });

  test('filters customers by related vehicle license plate', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();

    await customersPage.searchByVehiclePlate('NXE-441');

    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna)).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.bela)).toHaveCount(0);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.nora)).toHaveCount(0);
  });

  test('shows empty state when search has no matching customers', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();

    await customersPage.searchByVehiclePlate('ZZZ-000');

    await expect(page.getByText(/No customers match your current filter|Nincs a szűrésnek megfelelő ügyfél/i)).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna)).toHaveCount(0);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.bela)).toHaveCount(0);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.nora)).toHaveCount(0);
  });

  test('opens vehicle history panel without vehicle specification fields', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    await customersPage.openVehicleDetails(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);

    const panel = customersPage.detailsPanel();
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
    await expect(panel).toContainText('Hybrid system inspection');
    await expect(panel).not.toContainText(/HP|Torque/i);

    await customersPage.vehicleDetailsToggle(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441).click();
    await customersPage.expectCustomerHistoryPanel();
  });

  test('shows empty state for vehicles without repair history', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    await customersPage.vehicleDetailsToggle(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.phe220).click();

    const panel = customersPage.detailsPanel();
    await customersPage.expectVehicleHistoryOnlyPanel('PHE-220');
    await expect(panel).toContainText(/No repair history found for this vehicle|Nincs javítási előzmény ehhez a járműhöz/i);
  });

  test('vehicle form exposes VIN, kW power, and drivetrain without HP or torque', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    const dialog = await customersPage.openCreateVehicle(MOCK_CUSTOMER_IDS.anna);

    await expect(dialog.getByLabel('VIN')).toBeVisible();
    await expect(dialog.getByLabel('Engine power (kW)')).toBeVisible();
    await expect(dialog.getByLabel('Drivetrain')).toBeVisible();
    await expect(dialog).not.toContainText(/HP|Torque/i);

    await customersPage.fillVehicle(dialog, ELECTRIC_AUDI);

    await expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  test('creates a vehicle and refreshes the expanded customer vehicle list', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    const dialog = await customersPage.openCreateVehicle(MOCK_CUSTOMER_IDS.anna);

    await customersPage.fillVehicle(dialog, ELECTRIC_AUDI);
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(customersPage.vehicleDialog('Create vehicle')).toHaveCount(0);
    await expect(page.locator('output[aria-live="polite"]')).toContainText('Vehicle created successfully.');
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna).getByText('EVT-260')).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna).getByText('Audi Q4 e-tron (2023)')).toBeVisible();
  });
});

test.describe('Customer search field', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCustomerRegistry(page);
  });

  test('keeps the search magnifier visible while the field is focused and typing', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    const icon = customersPage.searchInput().locator('xpath=..').locator('svg').first();

    await customersPage.searchInput().click();
    await page.keyboard.type('ko');
    await expect(customersPage.searchInput()).toBeFocused();
    await expect.poll(() => countContrastPixels(page, icon)).toBeGreaterThan(8);

  });

  test('highlights a match with the accent text color only: no background, same font weight', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();

    await customersPage.searchInput().fill('kov');

    const match = customersPage.customerCard(MOCK_CUSTOMER_IDS.anna).locator('span.text-arsm-accent-vivid').first();
    await expect(match).toHaveText('Kov');
    const rest = match.locator('xpath=following-sibling::span').first();
    const read = (target: Locator) => target.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor, weight: style.fontWeight };
    });
    const [matched, plain] = [await read(match), await read(rest)];

    expect(matched.color).not.toBe(plain.color);
    expect(matched.background).toBe('rgba(0, 0, 0, 0)');
    expect(matched.weight).toBe(plain.weight);
  });
});

test.describe('Customer registry history dates', () => {
  // A fixed zone, so the fixture instants render the same wall-clock time on every machine.
  test.use({ timezoneId: 'UTC' });

  test.beforeEach(async ({ page }) => {
    await prepareCustomerRegistry(page);
  });

  test('shows dates as DD/MM/YYYY with a 24-hour clock', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);
    await customersPage.openVehicleDetails(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);

    // Scheduled at 09:00 UTC on 21 May 2026, due at 17:00 UTC on 24 May 2026.
    const historyItem = customersPage.detailsPanel().getByRole('button').filter({ hasText: 'Hybrid system inspection' });
    await expect(historyItem).toContainText('21/05/2026, 09:00');

    await historyItem.click();
    await expect(page.getByRole('dialog')).toContainText('24/05/2026, 17:00');
  });
});

test.describe('Customer registry vehicle history failures', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCustomerRegistry(page, {
      failedVehicleHistoryIds: [MOCK_VEHICLE_IDS.annaNxe441],
    });
  });

  test('keeps vehicle specifications hidden when history loading fails', async ({ page }) => {
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);

    await customersPage.openVehicleDetails(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);

    const panel = customersPage.detailsPanel();
    await customersPage.expectVehicleHistoryOnlyPanel('NXE-441');
    await expect(panel).toContainText(/No repair history found for this vehicle|Nincs javítási előzmény ehhez a járműhöz/i);
    await expect(errorToastMessage(page, /Failed to load repair history|Nem sikerült betölteni a javítási előzményeket/i)).toBeVisible();
  });
});