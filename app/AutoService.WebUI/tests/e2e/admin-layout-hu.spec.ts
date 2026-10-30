/** The admin page at 320px (roster, form and reset dialog stay inside the viewport) and in Hungarian
 * (page, roster actions, dialogs, form and server-error wording). */
import { expect, test, type Locator } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { fulfillJson } from './support/api-mock-response';
import { fillLockedPasswordField } from './support/password-fields';
import { MOCK_MECHANIC_IDS } from './support/test-data';
import { errorToastMessage } from './support/toast';
import { expectInsideViewport as expectInsideViewportOf } from './support/viewport-bounds';

const PHONE_WIDTH = 320;
const PETER = MOCK_MECHANIC_IDS.peter;

const expectInsideViewport = (target: Locator): Promise<void> => expectInsideViewportOf(target, PHONE_WIDTH);

test.describe('Admin page at 320px', () => {
  test.use({ viewport: { width: PHONE_WIDTH, height: 900 } });

  test('the page, the roster rows and their actions stay inside the viewport', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page);

    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(hasNoHorizontalOverflow).toBe(true);
    await expectInsideViewport(adminPage.rosterRow(PETER));
    await expectInsideViewport(adminPage.rosterRow(PETER).getByRole('button', { name: 'Reset password' }));
    await expectInsideViewport(adminPage.rosterRow(PETER).getByRole('button', { name: 'Delete mechanic' }));
  });

  test('the reset dialog fits and its confirm button stays reachable', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page);
    await adminPage.rosterRow(PETER).getByRole('button', { name: 'Reset password' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reset password' });

    await expectInsideViewport(dialog);
    await fillLockedPasswordField(dialog.getByLabel('Temporary password'), 'TempPass1!');
    const confirm = dialog.getByRole('button', { name: 'Reset password' });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeEnabled();
    await expectInsideViewport(confirm);
  });

  test('the registration form fields and Submit stay inside the viewport', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page);

    await adminPage.fillRequired({ email: 'phone.mechanic@example.test' });
    await adminPage.submit().scrollIntoViewIfNeeded();

    await expectInsideViewport(adminPage.email());
    await expectInsideViewport(adminPage.password());
    await expectInsideViewport(adminPage.submit());
    await expect(adminPage.submit()).toBeEnabled();
  });
});

test.describe('Admin page in Hungarian', () => {
  test('names the page, the roster and its actions in Hungarian', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page, { language: 'hu' });

    await expect(page.getByRole('heading', { name: 'Szerelők kezelése', level: 1 })).toBeVisible();
    await expect(adminPage.roster()).toBeVisible();
    await expect(adminPage.searchInput()).toHaveAttribute('placeholder', 'Szerelő neve...');
    await expect(adminPage.rosterRow(PETER).getByRole('button', { name: 'Jelszó visszaállítása' })).toBeVisible();
    await expect(adminPage.rosterRow(PETER).getByRole('button', { name: 'Szerelő törlése' })).toBeVisible();
    await expect(adminPage.submit()).toBeDisabled();
    await adminPage.searchInput().fill('zzzz');
    await expect(page.getByText('Nincs a keresésnek megfelelő szerelő.')).toBeVisible();
  });

  test('words the delete dialog and the password reset dialog in Hungarian', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page, { language: 'hu' });

    await adminPage.rosterRow(PETER).getByRole('button', { name: 'Szerelő törlése' }).click();
    const deleteDialog = page.getByRole('dialog', { name: 'Szerelő törlésének megerősítése' });
    await expect(deleteDialog).toContainText('Biztosan véglegesen törölni szeretné Peter Nagy (peter.nagy@example.com) szerelőt?');
    await deleteDialog.getByRole('button', { name: 'Mégse' }).click();
    await expect(deleteDialog).toHaveCount(0);

    await adminPage.rosterRow(PETER).getByRole('button', { name: 'Jelszó visszaállítása' }).click();
    const resetDialog = page.getByRole('dialog', { name: 'Jelszó visszaállítása' });
    const field = resetDialog.getByLabel('Ideiglenes jelszó');
    await fillLockedPasswordField(field, 'nouppercase1!');
    await resetDialog.getByRole('button', { name: 'Jelszó visszaállítása' }).click();

    await expect(errorToastMessage(page, 'A jelszónak tartalmaznia kell legalább egy nagybetűt.')).toBeVisible();
    await expect(field).toHaveAccessibleDescription(/A jelszónak tartalmaznia kell legalább egy nagybetűt\./);
  });

  test('words the mismatch and a conflict from the server in Hungarian', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page, { language: 'hu' });
    await page.route((url) => url.pathname === '/api/auth/register', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, { detail: 'An account already exists with this email address.' }, 409);
    });

    await adminPage.fillRequired({ email: 'hu.mechanic@example.test', confirmPassword: 'Different1!' });
    await expect(page.getByText('A jelszavak nem egyeznek.', { exact: true })).toBeVisible();

    await adminPage.confirmPassword().fill('StrongPass1!');
    await adminPage.submit().click();
    await adminPage.confirmDialog().getByRole('button', { name: 'Regisztrálás', exact: true }).click();

    await expect(page.getByText('Már létezik fiók ezzel az e-mail-címmel.', { exact: true }).first()).toBeVisible();
    await expect(adminPage.email()).toHaveAttribute('aria-invalid', 'true');
  });
});
