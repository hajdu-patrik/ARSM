/** Axe sweep of every app route and of the form-error and dialog states on the mocked API: WCAG 2.0 A and AA, no violation accepted. */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openSettings } from './pages/settings.page';
import { APP_ROUTE_CHECKS, LOGIN_ROUTE, prepareAppRoute } from './support/app-routes';

const WCAG_TAGS = ['wcag2a', 'wcag2aa'];

/** Runs the axe sweep over the page as it is now and expects no violation. */
async function expectNoViolations(page: Page): Promise<void> {
  await expect(page.locator('#root .arsm-loading-logo-halo')).toHaveCount(0);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
}

for (const route of APP_ROUTE_CHECKS) {
  test(`${route.name} has no WCAG 2.0 A or AA violation`, async ({ page }) => {
    await prepareAppRoute(page, route);
    await page.goto(route.path);
    await expect(route.ready(page)).toBeVisible();
    // The splash covers the page for a moment, and the lists load behind it: scan the settled page.
    await expect(page.locator('#root .arsm-loading-logo-halo')).toHaveCount(0);
    await page.waitForLoadState('networkidle');

    await expectNoViolations(page);
  });
}

test.describe('States the route sweep does not reach', () => {
  test('the login form with every field error and its error toast shown', async ({ page }) => {
    await prepareAppRoute(page, LOGIN_ROUTE);
    await page.goto(LOGIN_ROUTE.path);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.locator('#identifier')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true');

    await expectNoViolations(page);
  });

  test('Settings with the password-change confirmation open', async ({ page }) => {
    const { settings } = await openSettings(page);
    await settings.fillPasswords('CurrentPass1!', 'NewPassWord1!', 'NewPassWord1!');
    await settings.changePasswordButton().click();
    await expect(settings.confirmDialog('Confirm password change')).toBeVisible();

    await expectNoViolations(page);
  });

  test('Settings with the delete-profile dialog open and its mismatch message shown', async ({ page }) => {
    const { settings } = await openSettings(page);
    await settings.openDeleteDialog();
    await settings.fillDeletePasswords('CurrentPass1!', 'DifferentPass1!');
    await expect(page.locator('#delete-profile-password-confirm')).toHaveAttribute('aria-invalid', 'true');

    await expectNoViolations(page);
  });

  test('Settings with server field errors under the profile and password fields', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { 'PUT /api/profile': { status: 400, body: { errors: { Email: ['An account already exists with this email address.'] } } } },
    });
    await settings.email.fill('taken@example.test');
    await settings.saveProfileButton().click();
    await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(settings.email).toHaveAttribute('aria-invalid', 'true');
    await expect(settings.confirmDialog('Confirm changes')).toBeHidden();

    await expectNoViolations(page);
  });
});
