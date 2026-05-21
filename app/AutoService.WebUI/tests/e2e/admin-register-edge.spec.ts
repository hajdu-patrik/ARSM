import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

function registrationSelectors(page: Page) {
  return {
    firstName: page.locator('#firstName'),
    lastName: page.locator('#lastName'),
    email: page.locator('#reg-email'),
    password: page.locator('#reg-password'),
    confirmPassword: page.locator('#reg-confirm-password'),
    specialization: page.locator('#specialization'),
    submit: page.getByRole('button', { name: /Register Mechanic|Szerelő regisztrálása/i }),
  };
}

async function fillRequiredRegistrationFields(page: Page, email: string): Promise<void> {
  const selectors = registrationSelectors(page);

  await selectors.firstName.fill('Edge');
  await selectors.lastName.fill('Mechanic');
  await selectors.email.fill(email);
  await selectors.password.fill('StrongPass1!');
  await selectors.confirmPassword.fill('StrongPass1!');
  await selectors.specialization.selectOption('GasolineAndDiesel');
  await page.locator('label').filter({ hasText: /Engine|Motor/i }).first().click();
}

test.describe('Admin mechanic registration edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'admin.edge@example.test',
      isAuthenticated: true,
      isAdmin: true,
    });
    await page.goto('/admin/register');
    await expect(page.locator('#reg-email')).toBeVisible();
  });

  test('shows frontend mismatch validation before confirmation step', async ({ page }) => {
    const selectors = registrationSelectors(page);

    await selectors.firstName.fill('Edge');
    await selectors.lastName.fill('Mismatch');
    await selectors.email.fill('mismatch.mechanic@example.test');
    await selectors.password.fill('StrongPass1!');
    await selectors.confirmPassword.fill('DifferentPass1!');
    await selectors.specialization.selectOption('GasolineAndDiesel');
    await page.locator('label').filter({ hasText: /Engine|Motor/i }).first().click();

    await expect(page.locator('#reg-confirm-password')).toHaveAttribute('aria-invalid', 'true');
    await expect(selectors.submit).toBeDisabled();
    await expect(page.getByRole('dialog', { name: /Confirm Registration|Regisztráció megerősítése/i })).toHaveCount(0);
  });

  test('registers mechanic through confirmation modal and updates list', async ({ page }) => {
    const newEmail = 'new.mechanic@example.test';
    const selectors = registrationSelectors(page);

    await fillRequiredRegistrationFields(page, newEmail);
    await selectors.submit.click();

    const confirmDialog = page.getByRole('dialog', { name: /Confirm Registration|Regisztráció megerősítése/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /Register|Regisztrálás/i }).click();

    await expect(page.locator('output[aria-live="polite"]')).toContainText(/registered successfully|sikeresen regisztrálva/i);
    const mechanicsSection = page.locator('section[aria-label="Selected Mechanics"], section[aria-label="Kijelölt szerelők"]');
    await expect(mechanicsSection.getByText(newEmail, { exact: true })).toBeVisible();
  });
});
