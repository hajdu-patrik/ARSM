import { expect, test } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Theme and language controls', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);
  });

  test('toggle dark mode adds dark class to html', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const darkToggle = page.getByRole('button', { name: /dark|light|theme/i }).first();
    if (await darkToggle.isVisible()) {
      const hadDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      await darkToggle.click();
      await page.waitForTimeout(300);
      const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(hasDark).not.toBe(hadDark);
    }
  });

  test('dark mode preference persists across reload', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const darkToggle = page.getByRole('button', { name: /dark|light|theme/i }).first();
    if (await darkToggle.isVisible()) {
      await darkToggle.click();
      await page.waitForTimeout(300);
      const themeBefore = await page.evaluate(() => localStorage.getItem('preferred-theme'));

      await page.reload();
      await scheduler.expectLoaded();

      const themeAfter = await page.evaluate(() => localStorage.getItem('preferred-theme'));
      expect(themeAfter).toBe(themeBefore);
    }
  });

  test('switch language to Hungarian updates UI text', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const languageToggle = page.getByRole('button', { name: /^(EN|HU)$/ }).first();
    await expect(languageToggle).toBeVisible();

    const initialLang = await page.evaluate(() => document.documentElement.lang);
    if (initialLang !== 'hu') {
      await languageToggle.click();
    }

    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('hu');
  });

  test('switch language to English updates UI text', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const languageToggle = page.getByRole('button', { name: /^(EN|HU)$/ }).first();
    await expect(languageToggle).toBeVisible();

    const initialLang = await page.evaluate(() => document.documentElement.lang);
    if (initialLang !== 'hu') {
      await languageToggle.click();
      await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('hu');
    }

    await languageToggle.click();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en');
  });

  test('language preference persists across reload', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const languageToggle = page.getByRole('button', { name: /^(EN|HU)$/ }).first();
    await expect(languageToggle).toBeVisible();

    await languageToggle.click();
    await page.waitForTimeout(300);

    const expectedSavedLang = await page.evaluate(() => localStorage.getItem('preferred-language'));
    expect(expectedSavedLang === 'en' || expectedSavedLang === 'hu').toBe(true);

    await page.reload();
    await scheduler.expectLoaded();

    const savedLang = await page.evaluate(() => localStorage.getItem('preferred-language'));
    expect(savedLang).toBe(expectedSavedLang);

    if (savedLang === 'hu') {
      await page.getByRole('button', { name: /^(EN|HU)$/ }).first().click();
    }
  });

  test('language toggle is visible on login page', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    const langToggle = page.getByRole('button', { name: /^(EN|HU)$/ }).first();
    await expect(langToggle).toBeVisible();

    const count = await page.getByRole('button', { name: /^(EN|HU)$/ }).count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
