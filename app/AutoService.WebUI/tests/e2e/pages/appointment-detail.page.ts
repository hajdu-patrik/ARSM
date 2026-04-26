import { expect, type Page } from '@playwright/test';

/**
 * Page object for the appointment detail modal edit workflow.
 */
export class AppointmentDetailPage {
  constructor(private readonly page: Page) {}

  private dialog() {
    return this.page.getByRole('dialog', { name: 'Appointment Details' });
  }

  private vehicleInputByLabel(label: string) {
    return this.dialog()
      .locator('span', { hasText: label })
      .first()
      .locator('xpath=ancestor::div[1]')
      .locator('input');
  }

  /** Waits until the appointment detail modal is visible. */
  async expectOpen(): Promise<void> {
    await expect(this.dialog()).toBeVisible();
  }

  /** Asserts the detail modal is closed. */
  async expectClosed(): Promise<void> {
    await expect(this.dialog()).toBeHidden();
  }

  /** Enters edit mode from the detail modal footer. */
  async startEdit(): Promise<void> {
    await this.page.getByTestId('appointment-detail-edit').click();
    await expect(this.page.getByTestId('appointment-detail-due-datetime')).toBeVisible();
  }

  /**
   * Updates the due datetime field while in edit mode.
   *
   * @param dueDateTimeLocal - Local datetime value in YYYY-MM-DDTHH:mm format.
   */
  async setDueDateTime(dueDateTimeLocal: string): Promise<void> {
    await this.page.getByTestId('appointment-detail-due-datetime').fill(dueDateTimeLocal);
  }

  /**
   * Updates the task description field while in edit mode.
   *
   * @param description - New task description text.
   */
  async setTaskDescription(description: string): Promise<void> {
    const taskField = this.dialog()
      .locator('textarea, input[type="text"]')
      .filter({ hasText: '' });
    const textareas = this.dialog().locator('textarea');
    if (await textareas.count() > 0) {
      await textareas.first().fill(description);
    } else {
      await taskField.last().fill(description);
    }
  }

  /**
   * Updates the vehicle mileage field while in edit mode.
   *
   * @param mileageKm - Numeric mileage value to set.
   */
  async setVehicleMileageKm(mileageKm: string): Promise<void> {
    await this.vehicleInputByLabel('Mileage (km)').fill(mileageKm);
  }

  /**
   * Asserts the customer section shows name only and no customer email row.
   */
  async expectCustomerNameOnlySection(): Promise<void> {
    await expect(this.dialog().getByText('Customer Name', { exact: true })).toBeVisible();
    await expect(this.dialog().getByText('Email', { exact: true })).toHaveCount(0);
  }

  /** Saves appointment edits from the modal footer. */
  async save(): Promise<void> {
    await this.page.getByTestId('appointment-detail-save').click();
  }

  /** Cancels edit mode (clicks the cancel/close button). */
  async cancelEdit(): Promise<void> {
    const cancelBtn = this.dialog().getByRole('button', { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await this.dialog().getByRole('button', { name: /close/i }).click();
    }
  }

  /** Clicks the claim button if visible. */
  async clickClaim(): Promise<void> {
    await this.dialog().getByRole('button', { name: /claim/i }).click();
  }

  /** Clicks the "Unassign me" button if visible. */
  async clickUnclaim(): Promise<void> {
    await this.dialog().getByRole('button', { name: /unassign me/i }).click();
  }

  /** Changes the appointment status via the status select. */
  async changeStatus(status: string): Promise<void> {
    const select = this.dialog().locator('select[aria-label]').last();
    await select.selectOption({ label: status });
  }

  /** Returns the text of the status badge in the detail modal. */
  async getStatusBadgeText(): Promise<string> {
    const badge = this.dialog().locator('[class*="rounded-full"], [class*="badge"]').first();
    return (await badge.textContent()) ?? '';
  }
}
