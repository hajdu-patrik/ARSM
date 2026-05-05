import { expect, type Page } from '@playwright/test';

/**
 * Page object for the appointment detail modal edit workflow.
 */
export class AppointmentDetailPage {
  constructor(private readonly page: Page) {}

  private dialog() {
    return this.page.getByRole('dialog', { name: /appointment details/i });
  }

  private claimButton() {
    return this.dialog().getByRole('button', { name: /claim/i });
  }

  private unclaimButton() {
    return this.dialog().getByRole('button', { name: /unassign me/i });
  }

  private statusSelect() {
    return this.dialog().locator('select[aria-label]').last();
  }

  private addMechanicSelect() {
    return this.dialog().getByRole('combobox', { name: /select mechanic/i });
  }

  private addMechanicButton() {
    return this.dialog().getByRole('button', { name: /add mechanic/i });
  }

  private removeMechanicButtons() {
    return this.dialog().locator('button[title="Remove mechanic"]');
  }

  private removeMechanicConfirmDialog() {
    return this.page.getByRole('dialog', { name: /confirm mechanic removal/i });
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

  /** Asserts that vehicle fields remain read-only while the modal is in edit mode. */
  async expectVehicleFieldsReadOnlyInEdit(): Promise<void> {
    await expect(this.dialog().locator('input[type="number"]')).toHaveCount(0);
  }

  /**
   * Asserts the customer section shows name only and no customer email row.
   */
  async expectCustomerNameOnlySection(): Promise<void> {
    await expect(this.dialog().getByText('Name', { exact: true })).toBeVisible();
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

  /** Closes the detail modal from view mode. */
  async close(): Promise<void> {
    await this.dialog().getByRole('button', { name: /close/i }).click();
  }

  /** Clicks the claim button if visible. */
  async clickClaim(): Promise<void> {
    await this.claimButton().click();
  }

  /** Clicks the "Unassign me" button if visible. */
  async clickUnclaim(): Promise<void> {
    await this.unclaimButton().click();
  }

  /** Changes the appointment status via the status select. */
  async changeStatus(status: string): Promise<void> {
    await this.statusSelect().selectOption({ label: status });
  }

  /** Returns the text of the status badge in the detail modal. */
  async getStatusBadgeText(): Promise<string> {
    const badge = this.dialog().locator('[class*="rounded-full"], [class*="badge"]').first();
    return (await badge.textContent()) ?? '';
  }

  /** Returns true when the claim action is currently visible. */
  async isClaimButtonVisible(): Promise<boolean> {
    return this.claimButton().isVisible().catch(() => false);
  }

  /** Asserts the claim action is not visible (hidden or not rendered). */
  async expectClaimHidden(): Promise<void> {
    await expect(this.claimButton()).toHaveCount(0);
  }

  /** Returns true when the self-unassign action is currently visible. */
  async isUnclaimButtonVisible(): Promise<boolean> {
    return this.unclaimButton().isVisible().catch(() => false);
  }

  /** Asserts the self-unassign action is not visible (hidden or not rendered). */
  async expectUnclaimHidden(): Promise<void> {
    await expect(this.unclaimButton()).toHaveCount(0);
  }

  /** Returns true when status change select is available. */
  async isStatusSelectVisible(): Promise<boolean> {
    return this.statusSelect().isVisible().catch(() => false);
  }

  /** Selects first available mechanic from the admin assign dropdown. */
  async selectFirstAvailableMechanicForAssign(): Promise<string | null> {
    const select = this.addMechanicSelect();
    const isVisible = await select.isVisible().catch(() => false);
    if (!isVisible) {
      return null;
    }

    const options = select.locator('option:not([value=""])');
    const optionCount = await options.count();
    if (optionCount < 1) {
      return null;
    }

    const selectedValue = await options.first().getAttribute('value');
    if (!selectedValue) {
      return null;
    }

    await select.selectOption(selectedValue);
    return selectedValue;
  }

  /** Clicks the admin add-mechanic action. */
  async clickAddMechanic(): Promise<void> {
    await this.addMechanicButton().click();
  }

  /** Returns true when at least one admin remove-mechanic action is visible. */
  async isRemoveMechanicButtonVisible(): Promise<boolean> {
    return this.removeMechanicButtons().first().isVisible().catch(() => false);
  }

  /** Opens the remove-mechanic confirmation modal from the first visible remove action. */
  async openFirstRemoveMechanicConfirmation(): Promise<void> {
    await this.removeMechanicButtons().first().click();
  }

  /** Asserts the remove-mechanic confirmation modal is open. */
  async expectRemoveMechanicConfirmationOpen(): Promise<void> {
    await expect(this.removeMechanicConfirmDialog()).toBeVisible();
  }

  /** Asserts the remove-mechanic confirmation modal is closed. */
  async expectRemoveMechanicConfirmationClosed(timeout = 5_000): Promise<void> {
    await expect(this.removeMechanicConfirmDialog()).toHaveCount(0, { timeout });
  }
}
