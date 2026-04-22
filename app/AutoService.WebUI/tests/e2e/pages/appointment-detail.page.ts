import { expect, type Page } from '@playwright/test';

/**
 * Page object for the appointment detail modal edit workflow.
 */
export class AppointmentDetailPage {
  constructor(private readonly page: Page) {}

  /** Waits until the appointment detail modal is visible. */
  async expectOpen(): Promise<void> {
    await expect(this.page.getByRole('dialog', { name: 'Appointment Details' })).toBeVisible();
  }

  /** Asserts the detail modal is closed. */
  async expectClosed(): Promise<void> {
    await expect(this.page.getByRole('dialog', { name: 'Appointment Details' })).toBeHidden();
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
    const taskField = this.page.getByRole('dialog', { name: 'Appointment Details' })
      .locator('textarea, input[type="text"]')
      .filter({ hasText: '' });
    const textareas = this.page.getByRole('dialog', { name: 'Appointment Details' }).locator('textarea');
    if (await textareas.count() > 0) {
      await textareas.first().fill(description);
    } else {
      await taskField.last().fill(description);
    }
  }

  /** Saves appointment edits from the modal footer. */
  async save(): Promise<void> {
    await this.page.getByTestId('appointment-detail-save').click();
  }

  /** Cancels edit mode (clicks the cancel/close button). */
  async cancelEdit(): Promise<void> {
    const dialog = this.page.getByRole('dialog', { name: 'Appointment Details' });
    const cancelBtn = dialog.getByRole('button', { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await dialog.getByRole('button', { name: /close/i }).click();
    }
  }

  /** Clicks the claim button if visible. */
  async clickClaim(): Promise<void> {
    const dialog = this.page.getByRole('dialog', { name: 'Appointment Details' });
    await dialog.getByRole('button', { name: /claim/i }).click();
  }

  /** Clicks the "Unassign me" button if visible. */
  async clickUnclaim(): Promise<void> {
    const dialog = this.page.getByRole('dialog', { name: 'Appointment Details' });
    await dialog.getByRole('button', { name: /unassign me/i }).click();
  }

  /** Changes the appointment status via the status select. */
  async changeStatus(status: string): Promise<void> {
    const dialog = this.page.getByRole('dialog', { name: 'Appointment Details' });
    const select = dialog.locator('select[aria-label]').last();
    await select.selectOption({ label: status });
  }

  /** Returns the text of the status badge in the detail modal. */
  async getStatusBadgeText(): Promise<string> {
    const dialog = this.page.getByRole('dialog', { name: 'Appointment Details' });
    const badge = dialog.locator('[class*="rounded-full"], [class*="badge"]').first();
    return (await badge.textContent()) ?? '';
  }
}
