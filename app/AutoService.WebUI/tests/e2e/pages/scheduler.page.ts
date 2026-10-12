import { expect, type Locator, type Page } from '@playwright/test';
import { selectDropdownOption, selectDropdownOptionByLabel } from '../support/dropdown';
import { paginationControls, type PaginationControls } from '../support/pagination';

/** Page object for the scheduler calendar, intake and appointment detail dialogs. */
export class SchedulerPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.page.getByTestId('scheduler-intake-open')).toBeVisible();
  }

  intakeDialog(): Locator {
    return this.page.getByRole('dialog', { name: /New intake|Új felvétel/ });
  }

  detailDialog(): Locator {
    return this.page.getByRole('dialog', { name: /Appointment details/i });
  }

  deleteButton(): Locator {
    return this.detailDialog().getByTestId('appointment-detail-delete');
  }

  async openFirstAppointmentDetail(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Appointment details' }).first().click();

    const dialog = this.detailDialog();
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Selects today first when the intake button is disabled, then opens the intake dialog. */
  async openIntakeForCurrentDay(): Promise<Locator> {
    const openButton = this.page.getByTestId('scheduler-intake-open');

    if (await openButton.isDisabled()) {
      await this.page.getByTestId(currentDayTestId()).click();
      await expect(openButton).toBeEnabled();
    }

    await openButton.click();

    const dialog = this.intakeDialog();
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async searchByLicensePlate(licensePlate: string): Promise<void> {
    const dialog = this.intakeDialog();
    await dialog.getByTestId('scheduler-intake-license-plate-lookup').fill(licensePlate);
  }

  async searchByName(name: string): Promise<void> {
    const dialog = this.intakeDialog();
    await dialog.getByTestId('scheduler-intake-name-lookup').fill(name);
  }

  async searchMissingEmail(email: string): Promise<void> {
    const dialog = this.intakeDialog();
    await dialog.getByTestId('scheduler-intake-name-lookup').fill(email);
  }

  /** Picks one of the looked-up customer's vehicles in the intake form by its vehicle id. */
  async selectExistingVehicle(vehicleId: number): Promise<void> {
    await selectDropdownOption(this.page, 'scheduler-intake-existing-vehicle', String(vehicleId));
  }

  /** Changes the status in the open appointment detail dialog by the option's visible label. */
  async changeAppointmentStatus(statusLabel: string | RegExp): Promise<void> {
    const trigger = this.detailDialog().getByRole('combobox', { name: 'Change appointment status' });
    await selectDropdownOptionByLabel(this.page, trigger, statusLabel);
  }

  /** The pager of the intake customer-name suggestions. */
  suggestionsPagination(): PaginationControls {
    return paginationControls(this.intakeDialog(), 'intake-suggestions-pagination');
  }

  async createWithCurrentForm(): Promise<void> {
    await this.intakeDialog().getByTestId('scheduler-intake-create').click();
  }
}

/** The test id of today's cell in the calendar grid. */
export function currentDayTestId(): string {
  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `calendar-day-${year}-${month}-${day}`;
}