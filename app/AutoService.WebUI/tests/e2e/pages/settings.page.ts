import { expect, type Locator, type Page } from '@playwright/test';
import { installApiMocks, type InstallApiMockOptions } from '../support/api-mocks';
import { primeBrowserState } from '../support/browser-state';
import { fillLockedPasswordField } from '../support/password-fields';
import type { MockApiState } from '../support/test-data';

/** The Settings page in English: its sections, the profile fields and the password and delete flows. */
export class SettingsPage {
  readonly firstName: Locator;
  readonly middleName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly phone: Locator;
  readonly fileInput: Locator;
  readonly pictureSection: Locator;
  readonly personalSection: Locator;
  readonly companySection: Locator;
  readonly passwordSection: Locator;
  readonly deleteSection: Locator;

  constructor(private readonly page: Page) {
    this.firstName = page.locator('#settings-firstName');
    this.middleName = page.locator('#settings-middleName');
    this.lastName = page.locator('#settings-lastName');
    this.email = page.locator('#settings-email');
    this.phone = page.locator('#settings-phone');
    this.fileInput = page.locator('input[type="file"]');
    this.pictureSection = page.getByRole('region', { name: 'Profile picture' });
    this.personalSection = page.getByRole('region', { name: 'Personal information' });
    this.companySection = page.getByRole('region', { name: 'Company data' });
    this.passwordSection = page.getByRole('region', { name: 'Change password' });
    this.deleteSection = page.getByRole('region', { name: 'Delete profile' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await expect(this.firstName).toBeVisible();
  }

  saveProfileButton(): Locator {
    return this.personalSection.getByRole('button', { name: 'Save changes' });
  }

  /** The confirmation dialog that opens after a save or password change request. */
  confirmDialog(title: string): Locator {
    return this.page.getByRole('dialog', { name: title });
  }

  /** Types the three password fields (each stays read-only until it takes focus). */
  async fillPasswords(current: string, next: string, confirm: string): Promise<void> {
    await fillLockedPasswordField(this.page.locator('#change-password-current'), current);
    await fillLockedPasswordField(this.page.locator('#change-password-new'), next);
    await fillLockedPasswordField(this.page.locator('#change-password-confirm'), confirm);
  }

  changePasswordButton(): Locator {
    return this.passwordSection.getByRole('button', { name: 'Change password' });
  }

  /** Requests the password change and confirms it in the dialog. */
  async submitPasswordChange(current: string, next: string, confirm: string): Promise<void> {
    await this.fillPasswords(current, next, confirm);
    await this.changePasswordButton().click();
    await this.confirmDialog('Confirm password change').getByRole('button', { name: 'Change password' }).click();
  }

  /** Opens the delete-profile dialog and returns it. */
  async openDeleteDialog(): Promise<Locator> {
    await this.deleteSection.getByRole('button', { name: 'Delete profile' }).click();
    const dialog = this.confirmDialog('Confirm profile deletion');
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async fillDeletePasswords(password: string, confirm: string): Promise<void> {
    await fillLockedPasswordField(this.page.locator('#delete-profile-password'), password);
    await fillLockedPasswordField(this.page.locator('#delete-profile-password-confirm'), confirm);
  }
}

/** Signs a mechanic in through the mocks (restorable session, English, light) and opens Settings. */
export async function openSettings(
  page: Page,
  options: Partial<InstallApiMockOptions> = {},
): Promise<{ settings: SettingsPage; state: MockApiState }> {
  await primeBrowserState(page, { sessionHint: true, language: 'en', theme: 'light' });
  const state = await installApiMocks(page, { profileEmail: 'mechanic.settings@example.test', ...options });
  const settings = new SettingsPage(page);
  await settings.goto();
  return { settings, state };
}
