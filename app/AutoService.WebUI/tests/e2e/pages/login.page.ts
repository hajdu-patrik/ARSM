import { expect, type Page } from '@playwright/test';

/**
 * Page object for the login screen.
 */
export class LoginPage {
  constructor(private readonly page: Page) {}

  /** Navigates to the login route and waits for the form to become interactive. */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.page.locator('#identifier')).toBeVisible();
    await expect(this.page.locator('#password')).toBeVisible();
  }

  /**
   * Submits credentials using the email login mode.
   *
   * @param email - Mechanic email address.
   * @param password - Password to submit.
   */
  async submitWithEmail(email: string, password: string): Promise<void> {
    await this.switchToEmail();
    await this.page.locator('#identifier').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.getByRole('button', { name: 'Login', exact: true }).click();
  }

  /**
   * Submits credentials using the phone login mode.
   *
   * @param phone - Mechanic phone number.
   * @param password - Password to submit.
   */
  async submitWithPhone(phone: string, password: string): Promise<void> {
    await this.switchToPhone();
    await this.page.locator('#identifier').fill(phone);
    await this.page.locator('#password').fill(password);
    await this.page.getByRole('button', { name: 'Login', exact: true }).click();
  }

  /** Switches login method to email. */
  async switchToEmail(): Promise<void> {
    await this.page.getByRole('button', { name: 'Email', exact: true }).click();
  }

  /** Switches login method to phone. */
  async switchToPhone(): Promise<void> {
    await this.page.getByRole('button', { name: 'Phone', exact: true }).click();
  }

  /** Asserts that the browser remains on the login route. */
  async expectStillOnLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login$/);
  }

  /** Returns the current value of the identifier input. */
  async getIdentifierValue(): Promise<string> {
    return this.page.locator('#identifier').inputValue();
  }

  /** Returns the type attribute of the password input. */
  async getPasswordInputType(): Promise<string | null> {
    return this.page.locator('#password').getAttribute('type');
  }

  /** Clicks the password visibility toggle. */
  async togglePasswordVisibility(): Promise<void> {
    await this.page.locator('button[aria-label]').filter({ has: this.page.locator('svg') }).last().click();
  }

  /** Asserts the submit button is disabled. */
  async expectSubmitDisabled(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Login', exact: true })).toBeDisabled();
  }

  /** Asserts the submit button is enabled. */
  async expectSubmitEnabled(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Login', exact: true })).toBeEnabled();
  }
}
