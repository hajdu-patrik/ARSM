import { expect, type Locator, type Page } from '@playwright/test';

export class SchedulerPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.page.getByTestId('scheduler-intake-open')).toBeVisible();
  }

  intakeDialog(): Locator {
    return this.page.getByRole('dialog', { name: /New Intake|Új felvétel/ });
  }

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

  async createWithCurrentForm(): Promise<void> {
    await this.intakeDialog().getByTestId('scheduler-intake-create').click();
  }
}

function currentDayTestId(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `calendar-day-${year}-${month}-${day}`;
}