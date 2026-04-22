import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

/**
 * Sets localStorage flags to skip the loading page and force English locale.
 */
export async function initBrowserState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('loading-page-seen', '1');
    localStorage.setItem('preferred-language', 'en');
    localStorage.removeItem('autoservice-session-hint');
    sessionStorage.removeItem('scheduler-selected-view');
  });
}

/**
 * Performs a full email login flow and waits for the scheduler to load.
 */
export async function loginAsMechanic(page: Page, email: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.submitWithEmail(email, password);
  await page.waitForURL(/\/$/);
}
