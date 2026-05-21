import { expect, type Page } from '@playwright/test';
import type { AppointmentFlowEnv } from '../support/e2e-env';

type TestLanguage = 'en' | 'hu';

export class AuthPage {
  constructor(private readonly page: Page) {}

  async loginAsMechanic(env: AppointmentFlowEnv, language: TestLanguage = 'en'): Promise<void> {
    await this.prepareBrowserState(language);
    await this.page.goto('/login');

    await this.page.getByLabel(/Email|E-mail|Phone|Telefon/i).fill(env.mechanicEmail);
    await this.page.getByLabel(/Password|Jelszo|Jelszó/i).fill(env.mechanicPassword);

    await Promise.all([
      this.page.waitForURL((url) => url.pathname !== '/login'),
      this.page.getByRole('button', { name: /Login|Bejelentkezes|Bejelentkezés/i }).click(),
    ]);

    await expect(this.page.getByTestId('scheduler-intake-open')).toBeVisible();
  }

  private async prepareBrowserState(language: TestLanguage): Promise<void> {
    await this.page.addInitScript((preferredLanguage) => {
      localStorage.setItem('preferred-language', preferredLanguage);
      localStorage.setItem('loading-page-seen', 'true');
      localStorage.setItem('preferred-sidebar-collapsed', 'false');
    }, language);
  }
}