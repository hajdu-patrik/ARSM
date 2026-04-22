import { expect, type Page } from '@playwright/test';

/**
 * Page object for the admin mechanic management page.
 */
export class AdminPage {
  constructor(private readonly page: Page) {}

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
    const form = this.page.locator('form');

    const inputs = form.locator('input');
    await inputs.nth(0).fill(data.firstName);
    await inputs.nth(2).fill(data.lastName);
    await inputs.nth(3).fill(data.email);

    const passwordInput = form.locator('input[type="password"], input[autocomplete="new-password"]').first();
    await passwordInput.fill(data.password);

    if (data.specialization) {
      const select = form.locator('select').first();
      await select.selectOption({ label: data.specialization });
    }
  }

  /** Clicks the submit button on the registration form. */
  async submitRegistration(): Promise<void> {
    const form = this.page.locator('form');
    await form.locator('button[type="submit"]').click();
  }

  /** Asserts the submit button is disabled. */
  async expectSubmitDisabled(): Promise<void> {
    const form = this.page.locator('form');
    await expect(form.locator('button[type="submit"]')).toBeDisabled();
  }

  /** Asserts an inline error is visible. */
  async expectInlineError(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: false })).toBeVisible({ timeout: 5_000 });
  }
}
