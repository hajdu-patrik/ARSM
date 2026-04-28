import { expect, type Page } from '@playwright/test';

/**
 * Page object for the admin mechanic management page.
 */
export class AdminPage {
  constructor(private readonly page: Page) {}

  private registrationForm() {
    return this.page.locator('form').first();
  }

  private passwordInput() {
    return this.page.locator('#reg-password');
  }

  /** Navigates to the admin page and waits for content. */
  async goto(): Promise<void> {
    await this.page.goto('/admin/register');
    await this.expectLoaded();
  }

  /** Asserts the admin page has loaded. */
  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 15_000 });
  }

  /** Returns the count of mechanic rows in the list. */
  async getMechanicCount(): Promise<number> {
    const listSection = this.page.locator('div').filter({ hasText: /mechanic/i }).first();
    const rows = listSection.locator('[class*="flex"][class*="items-center"]');
    return rows.count();
  }

  /** Fills the registration form with provided data. */
  async fillRegistrationForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    specialization?: string;
  }): Promise<void> {
    const form = this.registrationForm();

    await form.locator('#firstName').fill(data.firstName);
    await form.locator('#lastName').fill(data.lastName);
    await form.locator('#reg-email').fill(data.email);
    await this.passwordInput().fill(data.password);

    if (data.specialization) {
      const select = form.locator('select').first();
      await select.selectOption({ label: data.specialization });
    }
  }

  /** Asserts password input accessibility metadata used by the security section. */
  async expectPasswordFieldAccessibility(): Promise<void> {
    await expect(this.passwordInput()).toHaveAttribute('autocomplete', 'new-password');
    await expect(this.passwordInput()).toHaveAttribute('aria-invalid', /^(true|false)$/);
    await expect(this.passwordInput()).toHaveAttribute('aria-describedby', /(^|\s)reg-credential-hint(\s|$)/);
    await expect(this.page.locator('#reg-credential-hint')).toBeVisible();
  }

  /** Clicks the submit button on the registration form. */
  async submitRegistration(): Promise<void> {
    const form = this.registrationForm();
    await form.locator('button[type="submit"]').click();
  }

  /** Asserts the submit button is disabled. */
  async expectSubmitDisabled(): Promise<void> {
    const form = this.registrationForm();
    await expect(form.locator('button[type="submit"]')).toBeDisabled();
  }

  /** Asserts an inline error is visible. */
  async expectInlineError(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: false })).toBeVisible({ timeout: 5_000 });
  }
}
