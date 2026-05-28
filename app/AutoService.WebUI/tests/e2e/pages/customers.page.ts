import { expect, type Locator, type Page } from '@playwright/test';

const vehicleDetailsToggleLabelPattern = /Show vehicle history|Hide vehicle history|Open vehicle details|Jármű előzmények mutatása|Jármű előzmények elrejtése|Jármű részleteinek megnyitása/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export class CustomersPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/customers');
    await expect(this.page.getByRole('heading', { name: 'Customers' })).toBeVisible();
    await expect(this.searchInput()).toBeVisible();
  }

  searchInput(): Locator {
    return this.page.getByTestId('customers-search-input');
  }

  customerCard(customerId: number): Locator {
    return this.page.getByTestId(`customer-card-${customerId}`);
  }

  detailsPanel(): Locator {
    return this.page.getByRole('complementary', { name: 'Customer details panel' });
  }

  vehicleDetailsToggle(customerId: number, index = 0): Locator {
    return this.customerCard(customerId).getByRole('button', { name: vehicleDetailsToggleLabelPattern }).nth(index);
  }

  vehicleDialog(title: string): Locator {
    return this.page.getByRole('dialog', { name: title });
  }

  async searchByVehiclePlate(licensePlate: string): Promise<void> {
    await this.searchInput().fill(licensePlate);
  }

  async expandCustomer(customerId: number): Promise<void> {
    await this.page.getByTestId(`customer-expand-${customerId}`).click();
    await expect(this.customerCard(customerId).getByRole('heading', { name: 'Vehicles', exact: true })).toBeVisible();
  }

  async openFirstVehicleDetails(customerId: number): Promise<void> {
    await this.vehicleDetailsToggle(customerId).click();
    await expect(this.detailsPanel()).toBeVisible();
  }

  async expectVehicleHistoryOnlyPanel(licensePlate: string): Promise<void> {
    const panel = this.detailsPanel();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', {
      name: new RegExp(`${escapeRegExp(licensePlate)} (vehicle repair history|jármű javítási előzményei)`, 'i'),
    })).toBeVisible();
    await expect(panel).not.toContainText(/VIN|Engine power \(kW\)|Drivetrain|WVWZZZAUZJW123456|110 kW/i);
  }

  async expectCustomerHistoryPanel(): Promise<void> {
    const panel = this.detailsPanel();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: /Customer repair history|Ügyfél javítási előzményei/i })).toBeVisible();
  }

  async openCreateVehicle(customerId: number): Promise<Locator> {
    await this.customerCard(customerId).getByRole('button', { name: 'Create vehicle' }).click();
    const dialog = this.vehicleDialog('Create vehicle');
    await expect(dialog).toBeVisible();
    return dialog;
  }
}