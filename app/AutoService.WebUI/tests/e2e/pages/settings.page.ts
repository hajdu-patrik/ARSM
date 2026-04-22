import { expect, type Page } from '@playwright/test';

/**
 * Page object for the settings page.
 */
export class SettingsPage {
  constructor(private readonly page: Page) {}

  /** Navigates to the settings page and waits for profile data to load. */
  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await this.expectLoaded();
  }

  /** Asserts the settings page has loaded profile data. */
  async expectLoaded(): Promise<void> {
    await expect(this.page.locator('input[id="firstName"], input[name="firstName"]').first()).toBeVisible({ timeout: 15_000 });
  }

  /** Updates the middle name field value. */
  async fillMiddleName(value: string): Promise<void> {
    const field = this.page.locator('input').filter({ has: this.page.locator('[placeholder]') }).nth(2);
    await field.fill(value);
  }

  /** Fills the personal info first name field. */
  async fillFirstName(value: string): Promise<void> {
    await this.page.locator('input[id="firstName"], input[name="firstName"]').first().fill(value);
  }

  /** Returns the value of the first name input. */
  async getFirstNameValue(): Promise<string> {
    return this.page.locator('input[id="firstName"], input[name="firstName"]').first().inputValue();
  }

  /** Clicks the personal info save/update button. */
  async submitPersonalInfo(): Promise<void> {
    const forms = this.page.locator('form');
    await forms.first().locator('button[type="submit"]').click();
  }

  /** Fills the change password form fields. */
  async fillPasswordChange(current: string, newPw: string, confirm: string): Promise<void> {
    const passwordInputs = this.page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(current);
    await passwordInputs.nth(1).fill(newPw);
    await passwordInputs.nth(2).fill(confirm);
  }

  /** Submits the change password form. */
  async submitPasswordChange(): Promise<void> {
    const forms = this.page.locator('form');
    await forms.nth(1).locator('button[type="submit"]').click();
  }

  /** Asserts that an inline error message containing the given text is visible. */
  async expectInlineError(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: false })).toBeVisible({ timeout: 5_000 });
  }

  /** Opens the delete profile modal. */
  async openDeleteModal(): Promise<void> {
    const deleteBtn = this.page.getByRole('button', { name: /delete/i });
    await deleteBtn.click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  /** Fills the delete confirmation password and confirms. */
  async confirmDelete(password: string): Promise<void> {
    await this.page.locator('#delete-profile-password').fill(password);
    const confirmBtn = this.page.getByRole('dialog').getByRole('button', { name: /delete|confirm/i }).last();
    await confirmBtn.click();
  }

  /** Triggers the file input for profile picture upload. */
  async uploadPicture(filePath: string): Promise<void> {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  /** Confirms the crop in the crop modal. */
  async confirmCrop(): Promise<void> {
    const cropDialog = this.page.getByRole('dialog');
    await expect(cropDialog).toBeVisible();
    await cropDialog.getByRole('button', { name: /save|confirm|crop/i }).click();
  }

  /** Cancels the crop modal. */
  async cancelCrop(): Promise<void> {
    const cropDialog = this.page.getByRole('dialog');
    await cropDialog.getByRole('button', { name: /cancel/i }).click();
  }

  /** Clicks the remove profile picture button. */
  async removePicture(): Promise<void> {
    await this.page.getByRole('button', { name: /remove/i }).click();
  }
}
