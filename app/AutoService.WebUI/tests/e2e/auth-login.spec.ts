import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { getAppointmentFlowEnv, getMechanicPhone } from './support/e2e-env';
import { initBrowserState } from './support/auth.helper';

test.describe('Login page', () => {
  let env: ReturnType<typeof getAppointmentFlowEnv>;

  test.beforeEach(async ({ page }) => {
    env = getAppointmentFlowEnv();
    await initBrowserState(page);
  });

  test('email login with valid credentials redirects to scheduler', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.status() === 200,
    );
    await loginPage.submitWithEmail(env.mechanicEmail, env.mechanicPassword);
    await responsePromise;

    await expect(page).toHaveURL(/\/$/);
  });

  test('email login with wrong password stays on login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.status() === 401,
    );
    await loginPage.submitWithEmail(env.mechanicEmail, env.wrongPassword);
    await responsePromise;

    await loginPage.expectStillOnLogin();
  });

  test('phone login with valid credentials redirects to scheduler', async ({ page }) => {
    const phone = getMechanicPhone();
    test.skip(!phone, 'ARSM_TEST_MECHANIC_PHONE not configured');

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.status() === 200,
    );
    await loginPage.submitWithPhone(phone!, env.mechanicPassword);
    await responsePromise;

    await expect(page).toHaveURL(/\/$/);
  });

  test('switching login method clears the identifier field', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.switchToEmail();
    await page.locator('#identifier').fill('test@example.com');

    await loginPage.switchToPhone();
    const value = await loginPage.getIdentifierValue();
    expect(value).toBe('');
  });

  test('password visibility toggle changes input type', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const initialType = await loginPage.getPasswordInputType();
    expect(initialType).toBe('password');

    await loginPage.togglePasswordVisibility();
    const afterToggle = await loginPage.getPasswordInputType();
    expect(afterToggle).toBe('text');

    await loginPage.togglePasswordVisibility();
    const afterSecondToggle = await loginPage.getPasswordInputType();
    expect(afterSecondToggle).toBe('password');
  });

  test('submit button is disabled when fields are empty', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectSubmitDisabled();
  });

  test('submit button enables when both fields are filled', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await page.locator('#identifier').fill('user@test.com');
    await page.locator('#password').fill('somepassword');

    await loginPage.expectSubmitEnabled();
  });
});
