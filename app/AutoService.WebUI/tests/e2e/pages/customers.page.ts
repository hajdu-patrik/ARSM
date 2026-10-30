import { expect, type Locator, type Page } from '@playwright/test';
import type { InstallApiMockOptions } from '../support/api-mocks';
import type { TestLanguage } from '../support/browser-state';
import { selectDropdownOptionByLabel } from '../support/dropdown';
import { paginationControls, type PaginationControls } from '../support/pagination';
import { signInWithMocks } from '../support/sign-in';
import type { MockApiState } from '../support/test-data';

const vehicleDetailsToggleLabelPattern = /Show vehicle history|Hide vehicle history|Járműelőzmények megjelenítése|Járműelőzmények elrejtése/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** Anna's vehicle rows are ordered by brand like the API: the Hyundai PHE-220 first, the Volkswagen NXE-441 second. */
export const ANNA_VEHICLE_ROW = { phe220: 0, nxe441: 1 } as const;

/** The eight fields of the vehicle form; the drivetrain is the visible option label. */
export interface VehicleFormValues {
  readonly licensePlate: string;
  readonly vin: string;
  readonly brand: string;
  readonly model: string;
  readonly year: string;
  readonly mileageKm: string;
  readonly enginePowerKw: string;
  readonly drivetrain: string;
}

/** The fields of the customer form; the middle name and the phone number are optional. */
export interface CustomerFormValues {
  readonly firstName: string;
  readonly middleName?: string;
  readonly lastName: string;
  readonly email: string;
  readonly phoneNumber?: string;
}

/** A valid vehicle that no fixture owns, so a form filled with it saves. */
export const ELECTRIC_AUDI: VehicleFormValues = {
  licensePlate: 'EVT-260',
  vin: 'WAUZZZF43MA123456',
  brand: 'Audi',
  model: 'Q4 e-tron',
  year: '2023',
  mileageKm: '18000',
  enginePowerKw: '150',
  drivetrain: 'Electric',
};

/** Page object for the Customers page and its vehicle history panel. */
export class CustomersPage {
  constructor(private readonly page: Page) {}

  /** Signs in with the API mocks (an admin when the options say so) and opens the Customers page. */
  static async open(
    page: Page,
    options: Partial<InstallApiMockOptions> = {},
    language: TestLanguage = 'en',
  ): Promise<{ customersPage: CustomersPage; state: MockApiState }> {
    const state = await signInWithMocks(page, options, language);
    const customersPage = new CustomersPage(page);
    await customersPage.goto(language === 'hu' ? 'Ügyfelek' : 'Customers');

    return { customersPage, state };
  }

  async goto(heading = 'Customers'): Promise<void> {
    await this.page.goto('/customers');
    await expect(this.page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await expect(this.searchInput()).toBeVisible();
  }

  createCustomerButton(): Locator {
    return this.page.getByTestId('customers-create-button');
  }

  customerDialog(title: string): Locator {
    return this.page.getByRole('dialog', { name: title });
  }

  async openCreateCustomer(): Promise<Locator> {
    await this.createCustomerButton().click();
    const dialog = this.customerDialog('Create customer');
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async openEditCustomer(customerId: number): Promise<Locator> {
    await this.customerCard(customerId).getByRole('button', { name: 'Edit customer' }).click();
    const dialog = this.customerDialog('Edit customer');
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async openDeleteCustomer(customerId: number): Promise<Locator> {
    await this.customerCard(customerId).getByRole('button', { name: 'Delete customer' }).click();
    const dialog = this.customerDialog('Confirm customer deletion');
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async fillCustomer(dialog: Locator, values: CustomerFormValues): Promise<void> {
    await dialog.getByLabel('First name').fill(values.firstName);
    await dialog.getByLabel('Middle name').fill(values.middleName ?? '');
    await dialog.getByLabel('Last name').fill(values.lastName);
    await dialog.getByLabel('Email').fill(values.email);
    await dialog.getByLabel('Phone number').fill(values.phoneNumber ?? '');
  }

  async fillVehicle(dialog: Locator, values: VehicleFormValues): Promise<void> {
    await dialog.getByLabel('License plate').fill(values.licensePlate);
    await dialog.getByLabel('VIN').fill(values.vin);
    await dialog.getByLabel('Brand').fill(values.brand);
    await dialog.getByLabel('Model').fill(values.model);
    await dialog.getByLabel('Year').fill(values.year);
    await dialog.getByLabel('Mileage (km)').fill(values.mileageKm);
    await dialog.getByLabel('Engine power (kW)').fill(values.enginePowerKw);
    await selectDropdownOptionByLabel(this.page, dialog.getByLabel('Drivetrain'), values.drivetrain);
  }

  async openEditVehicle(customerId: number, index: number): Promise<Locator> {
    await this.vehicleTile(customerId, index).getByRole('button', { name: 'Edit vehicle' }).click();
    const dialog = this.vehicleDialog('Edit vehicle');
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async openDeleteVehicle(customerId: number, index: number): Promise<Locator> {
    await this.vehicleTile(customerId, index).getByRole('button', { name: 'Delete vehicle' }).click();
    const dialog = this.vehicleDialog('Confirm vehicle deletion');
    await expect(dialog).toBeVisible();
    return dialog;
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
    return this.page.getByRole('complementary', { name: /^(Customer details panel|Ügyféladatok panel)$/ });
  }

  /** A whole vehicle tile; a click anywhere on it outside the row actions toggles the vehicle's history. */
  vehicleTile(customerId: number, index = 0): Locator {
    return this.customerCard(customerId).getByTestId('vehicle-tile').nth(index);
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
    await expect(this.customerCard(customerId).getByRole('heading', { name: /^(Vehicles|Járművek)$/ })).toBeVisible();
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