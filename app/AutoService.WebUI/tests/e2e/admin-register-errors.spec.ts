/** Mechanic registration refused by the server: 403, field errors under their fields, the generic duplicate
 * answer, a conflict detail, the Identity password policy and a retry that succeeds. */
import { expect, test, type Page } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { fulfillJson } from './support/api-mock-response';
import { errorToastMessage, toastMessage, toastRegion } from './support/toast';

const NEW_EMAIL = 'refused.mechanic@example.test';

/** Answers the next `count` registrations with the given status and body, then lets the mock handle them. */
async function refuseRegistration(page: Page, status: number, body: unknown, count = Number.POSITIVE_INFINITY): Promise<void> {
  let refused = 0;
  await page.route((url) => url.pathname === '/api/auth/register', async (route) => {
    if (route.request().method() !== 'POST' || refused >= count) {
      await route.fallback();
      return;
    }
    refused += 1;
    await fulfillJson(route, body, status);
  });
}

test.describe('Registration refused by the server', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    ({ adminPage } = await AdminPage.open(page));
  });

  test('a 403 toasts the missing permission and keeps the form', async ({ page }) => {
    await refuseRegistration(page, 403, { detail: 'Forbidden' });
    await adminPage.register({ email: NEW_EMAIL });

    await expect(errorToastMessage(page, 'You do not have permission to register mechanics.')).toBeVisible();
    await expect(adminPage.email()).toHaveValue(NEW_EMAIL);
  });

  test('field errors show under their fields and each one clears when its field is edited', async ({ page }) => {
    await refuseRegistration(page, 400, {
      errors: {
        FirstName: ['First name may only contain letters and hyphens.'],
        Email: ['Email must be a valid email address.'],
        PhoneNumber: ['Phone number must be a valid European number.'],
      },
    });
    await adminPage.register({ email: NEW_EMAIL });

    await expect(page.getByText('Name may only contain letters and hyphens.', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Email must be a valid email address.', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Phone number must be a valid European number.', { exact: true }).first()).toBeVisible();
    for (const field of [adminPage.firstName(), adminPage.email(), adminPage.phone()]) {
      await expect(field).toHaveAttribute('aria-invalid', 'true');
    }
    await expect(adminPage.lastName()).not.toHaveAttribute('aria-invalid', 'true');

    await adminPage.email().fill('fixed.mechanic@example.test');
    await expect(adminPage.email()).not.toHaveAttribute('aria-invalid', 'true');
    await expect(adminPage.firstName()).toHaveAttribute('aria-invalid', 'true');
    await expect(adminPage.phone()).toHaveAttribute('aria-invalid', 'true');
  });

  test('a duplicate account is refused with the generic answer: an error toast, nothing registered, form kept', async ({ page }) => {
    await refuseRegistration(page, 400, {
      errors: { register: ['Registration failed. Please check your information, or the account may already exist.'] },
    });
    await adminPage.register({ email: NEW_EMAIL });

    await expect(toastRegion(page).getByRole('alert')).toBeVisible();
    await expect(toastMessage(page, /registered successfully/)).toHaveCount(0);
    await expect(adminPage.email()).toHaveValue(NEW_EMAIL);
    await expect(adminPage.roster().getByText(NEW_EMAIL, { exact: true })).toHaveCount(0);
  });

  test('an e-mail or phone conflict detail is pinned to its own field', async ({ page }) => {
    await refuseRegistration(page, 409, { detail: 'An account already exists with this email address.' }, 1);
    await adminPage.fillRequired({ email: NEW_EMAIL });
    await adminPage.phone().fill('+36301234567');
    await adminPage.submit().click();
    await adminPage.confirmDialog().getByRole('button', { name: 'Register', exact: true }).click();

    await expect(adminPage.email()).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('An account already exists with this email address.', { exact: true }).first()).toBeVisible();
    await expect(adminPage.phone()).not.toHaveAttribute('aria-invalid', 'true');
  });

  const POLICY_REFUSALS = [
    { code: 'PasswordRequiresUpper', description: "Passwords must have at least one uppercase ('A'-'Z').", message: 'Password must contain at least one uppercase letter.' },
    { code: 'PasswordRequiresDigit', description: "Passwords must have at least one digit ('0'-'9').", message: 'Password must contain at least one number.' },
    { code: 'PasswordRequiresNonAlphanumeric', description: 'Passwords must have at least one non alphanumeric character.', message: 'Password must contain at least one special character.' },
  ] as const;

  for (const { code, description, message } of POLICY_REFUSALS) {
    test(`toasts the password policy message of ${code}`, async ({ page }) => {
      await refuseRegistration(page, 400, { errors: { [code]: [description] } });
      await adminPage.register({ email: NEW_EMAIL });

      await expect(errorToastMessage(page, message)).toBeVisible();
      await expect(adminPage.email()).toHaveValue(NEW_EMAIL);
    });
  }

  test('a refused registration can be retried and then succeeds', async ({ page }) => {
    await refuseRegistration(page, 400, { errors: { Email: ['Email must be a valid email address.'] } }, 1);
    await adminPage.register({ email: NEW_EMAIL });
    await expect(adminPage.email()).toHaveAttribute('aria-invalid', 'true');

    await adminPage.email().fill('retry.mechanic@example.test');
    await adminPage.submit().click();
    await adminPage.confirmDialog().getByRole('button', { name: 'Register', exact: true }).click();

    await expect(toastMessage(page, 'Mechanic "retry.mechanic@example.test" registered successfully.')).toBeVisible();
    await expect(adminPage.email()).toHaveValue('');
    await expect(adminPage.roster().getByText('retry.mechanic@example.test', { exact: true })).toBeVisible();
  });
});
