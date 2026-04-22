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

    const huButton = page.getByRole('button', { name: 'HU' });
    if (await huButton.isVisible()) {
      await huButton.click();
      await page.waitForTimeout(500);

      const lang = await page.evaluate(() => document.documentElement.lang);
      expect(lang).toBe('hu');
    }
  });

  test('switch language to English updates UI text', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const huButton = page.getByRole('button', { name: 'HU' });
    if (await huButton.isVisible()) {
      await huButton.click();
      await page.waitForTimeout(300);
    }

    const enButton = page.getByRole('button', { name: 'EN' });
    if (await enButton.isVisible()) {
      await enButton.click();
      await page.waitForTimeout(500);

      const lang = await page.evaluate(() => document.documentElement.lang);
      expect(lang).toBe('en');
    }
  });

  test('language preference persists across reload', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const huButton = page.getByRole('button', { name: 'HU' });
    if (await huButton.isVisible()) {
      await huButton.click();
      await page.waitForTimeout(300);

      await page.reload();
      await scheduler.expectLoaded();

      const savedLang = await page.evaluate(() => localStorage.getItem('preferred-language'));
      expect(savedLang).toBe('hu');

      const enButton = page.getByRole('button', { name: 'EN' });
      if (await enButton.isVisible()) {
        await enButton.click();
      }
    }
  });

  test('language toggle is visible on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(1_000);

    const langButtons = page.getByRole('button', { name: /^(EN|HU)$/ });
    const count = await langButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
