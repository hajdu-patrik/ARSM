import { expect, type Locator, type Page } from '@playwright/test';
import { paginationControls, type PaginationControls } from '../support/pagination';

const vehicleDetailsToggleLabelPattern = /Show vehicle history|Hide vehicle history|Járműelőzmények megjelenítése|Járműelőzmények elrejtése/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** Anna's vehicle rows are ordered by brand like the API: the Hyundai PHE-220 first, the Volkswagen NXE-441 second. */
export const ANNA_VEHICLE_ROW = { phe220: 0, nxe441: 1 } as const;

/** Page object for the Customers page and its vehicle history panel. */
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

  pagination(): PaginationControls {
    return paginationControls(this.page, 'customers-pagination');
  }

  /** The vehicle pager inside an expanded customer card. */
  vehiclePagination(customerId: number): PaginationControls {
    return paginationControls(this.customerCard(customerId), 'customer-vehicles-pagination');
  }

  customerCard(customerId: number): Locator {
    return this.page.getByTestId(`customer-card-${String(customerId)}`);
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
    await this.page.getByTestId(`customer-expand-${String(customerId)}`).click();
    await expect(this.customerCard(customerId).getByRole('heading', { name: 'Vehicles', exact: true })).toBeVisible();
  }

  async openVehicleDetails(customerId: number, index = 0): Promise<void> {
    await this.vehicleDetailsToggle(customerId, index).click();
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