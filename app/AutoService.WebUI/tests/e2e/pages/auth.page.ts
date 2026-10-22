import { expect, type Page } from '@playwright/test';
import { seedSplashShown, type TestLanguage } from '../support/browser-state';
import type { AppointmentFlowEnv } from '../support/e2e-env';

/** Page object for the login flow. */
export class AuthPage {
  constructor(private readonly page: Page) {}

  /** Primes language and sidebar state, signs in and waits for the scheduler. */
  async loginAsMechanic(env: AppointmentFlowEnv, language: TestLanguage = 'en'): Promise<void> {
    await this.submitLogin(env, language);

    await expect(this.page.getByTestId('scheduler-intake-open')).toBeVisible();
  }

  /** Primes language and sidebar state, fills the login form and submits it; resolves once the app left `/login`. */
  async submitLogin(env: AppointmentFlowEnv, language: TestLanguage = 'en'): Promise<void> {
    await this.prepareBrowserState(language);
    await this.page.goto('/login');

    await this.page.getByLabel(/Email|E-mail|Phone|Telefon/i).fill(env.mechanicEmail);
    await this.page.getByLabel(/Password|Jelszo|Jelszó/i).fill(env.mechanicPassword);

    await Promise.all([
      this.page.waitForURL((url) => url.pathname !== '/login'),
      this.page.getByRole('button', { name: /Log in|Bejelentkezés/i }).click(),
    ]);
  }

  private async prepareBrowserState(language: TestLanguage): Promise<void> {
    await seedSplashShown(this.page);
    await this.page.addInitScript((preferredLanguage) => {
      localStorage.setItem('preferred-language', preferredLanguage);
      localStorage.setItem('preferred-sidebar-collapsed', 'false');
    }, language);
  }
}