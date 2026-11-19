/** A 404 on a mechanic delete or password reset means the mechanic is already gone: the roster refreshes and the
 * dialog closes (before, the dialog stayed open over a stale row). */
import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { fillLockedPasswordField } from './support/password-fields';
import { MOCK_MECHANIC_IDS, type MockApiState } from './support/test-data';
import { errorToastMessage } from './support/toast';

/** Removes Peter from the mock roster, as if another admin deleted him while the dialog was open. */
function removePeter(state: MockApiState): void {
  const index = state.mechanics.findIndex((mechanic) => mechanic.personId === MOCK_MECHANIC_IDS.peter);
  if (index < 0) {
    throw new Error('Peter is part of the fixture roster.');
  }
  state.mechanics.splice(index, 1);
}

test.describe('Mechanic gone meanwhile', () => {
  test('a 404 on delete toasts the failure, closes the dialog and drops the row', async ({ page }) => {
    const { adminPage, state } = await AdminPage.open(page);
    const row = adminPage.rosterRow(MOCK_MECHANIC_IDS.peter);
    await row.getByRole('button', { name: 'Delete mechanic' }).click();
    const dialog = page.getByRole('dialog', { name: 'Confirm mechanic deletion' });
    await expect(dialog).toBeVisible();
    removePeter(state);

    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(errorToastMessage(page, 'Failed to delete mechanic.')).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await expect(row).toHaveCount(0);
    await expect(adminPage.rosterRow(MOCK_MECHANIC_IDS.gabor)).toBeVisible();
  });

  test('a 404 on password reset toasts the failure, closes the dialog and drops the row', async ({ page }) => {
    const { adminPage, state } = await AdminPage.open(page);
    const row = adminPage.rosterRow(MOCK_MECHANIC_IDS.peter);
    await row.getByRole('button', { name: 'Reset password' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reset password' });
    await expect(dialog).toBeVisible();
    removePeter(state);

    await fillLockedPasswordField(dialog.getByLabel('Temporary password'), 'TempPass1!');
    await dialog.getByRole('button', { name: 'Reset password' }).click();

    await expect(errorToastMessage(page, 'Failed to reset the password.')).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await expect(row).toHaveCount(0);
    await expect(adminPage.rosterRow(MOCK_MECHANIC_IDS.gabor)).toBeVisible();
  });
});
