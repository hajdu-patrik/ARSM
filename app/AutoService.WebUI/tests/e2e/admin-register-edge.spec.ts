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

function selectedMechanicsSection(page: Page) {
  return page.locator('section[aria-label="Selected Mechanics"], section[aria-label="Kijelölt szerelők"]');
}

/** Required registration form values with overridable defaults for edge cases. */
interface RequiredRegistrationFields {
  readonly email: string;
  readonly lastName?: string;
  readonly confirmPassword?: string;
}

/** Fills the required mechanic registration fields with deterministic defaults. */
async function fillRequiredRegistrationFields(page: Page, fields: RequiredRegistrationFields): Promise<void> {
  const {
    email,
    lastName = 'Mechanic',
    confirmPassword = 'StrongPass1!',
  } = fields;
  const selectors = registrationSelectors(page);

  await selectors.firstName.fill('Edge');
  await selectors.lastName.fill(lastName);
  await selectors.email.fill(email);
  await selectors.password.fill('StrongPass1!');
  await selectors.confirmPassword.fill(confirmPassword);
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
    await fillRequiredRegistrationFields(page, {
      email: 'mismatch.mechanic@example.test',
      lastName: 'Mismatch',
      confirmPassword: 'DifferentPass1!',
    });

    const selectors = registrationSelectors(page);

    await expect(page.locator('#reg-confirm-password')).toHaveAttribute('aria-invalid', 'true');
    await expect(selectors.submit).toBeDisabled();
    await expect(page.getByRole('dialog', { name: /Confirm Registration|Regisztráció megerősítése/i })).toHaveCount(0);
  });

  test('registers mechanic through confirmation modal and updates list', async ({ page }) => {
    const newEmail = 'new.mechanic@example.test';
    const selectors = registrationSelectors(page);

    await fillRequiredRegistrationFields(page, { email: newEmail });
    await selectors.submit.click();

    const confirmDialog = page.getByRole('dialog', { name: /Confirm Registration|Regisztráció megerősítése/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /Register|Regisztrálás/i }).click();

    await expect(page.locator('output[aria-live="polite"]')).toContainText(/registered successfully|sikeresen regisztrálva/i);
    const mechanicsSection = selectedMechanicsSection(page);
    await expect(mechanicsSection.getByText(newEmail, { exact: true })).toBeVisible();
  });

  test('deletes a newly registered mechanic through confirmation modal', async ({ page }) => {
    const newEmail = 'delete.mechanic@example.test';
    const selectors = registrationSelectors(page);
    const mechanicsSection = selectedMechanicsSection(page);

    await fillRequiredRegistrationFields(page, { email: newEmail });
    await selectors.submit.click();
    await page.getByRole('dialog', { name: /Confirm Registration|Regisztráció megerősítése/i })
      .getByRole('button', { name: /Register|Regisztrálás/i })
      .click();

    await expect(mechanicsSection.getByText(newEmail, { exact: true })).toBeVisible();
    await mechanicsSection.getByRole('button', { name: /Delete mechanic|Szerelő törlése/i }).last().click();

    const deleteDialog = page.getByRole('dialog', { name: /Confirm mechanic deletion|Szerelő törlésének megerősítése/i });
    await expect(deleteDialog).toContainText(newEmail);
    await deleteDialog.getByRole('button', { name: /Delete|Törlés/i }).click();

    await expect(page.locator('output[aria-live="polite"]')).toContainText(newEmail);
    await expect(mechanicsSection.getByText(newEmail, { exact: true })).toHaveCount(0);
  });
});
