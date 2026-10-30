/** Admin mechanic registration through the confirmation step, deleting that mechanic again, and the
 * roster's fixed five-row server paging and search. */
import { expect, test } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { recordGetRequests } from './support/request-log';
import type { MockApiState } from './support/test-data';
import { toastMessage } from './support/toast';

test.describe('Admin mechanic registration edge cases', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    ({ adminPage } = await AdminPage.open(page));
  });

  test('shows the mismatch message under the confirmation and offers no confirmation step', async ({ page }) => {
    await adminPage.fillRequired({ email: 'mismatch.mechanic@example.test', lastName: 'Mismatch', confirmPassword: 'DifferentPass1!' });

    await expect(adminPage.confirmPassword()).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Passwords do not match.', { exact: true })).toBeVisible();
    await expect(adminPage.submit()).toBeDisabled();
    await expect(adminPage.confirmDialog()).toHaveCount(0);

    await adminPage.confirmPassword().fill('StrongPass1!');
    await expect(adminPage.confirmPassword()).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Passwords do not match.', { exact: true })).toHaveCount(0);
    await expect(adminPage.submit()).toBeEnabled();
  });

  test('registers mechanic through confirmation modal and updates list', async ({ page }) => {
    const newEmail = 'new.mechanic@example.test';

    await adminPage.fillRequired({ email: newEmail });
    await adminPage.submit().click();

    const confirmDialog = adminPage.confirmDialog();
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /Register|Regisztrálás/i }).click();

    await expect(page.locator('output[aria-live="polite"]')).toContainText(/registered successfully|sikeresen regisztrálva/i);
    await expect(adminPage.roster().getByText(newEmail, { exact: true })).toBeVisible();
  });

  test('deletes a newly registered mechanic through confirmation modal', async ({ page }) => {
    const newEmail = 'delete.mechanic@example.test';
    const mechanicsSection = adminPage.roster();

    await adminPage.register({ email: newEmail });

    await expect(mechanicsSection.getByText(newEmail, { exact: true })).toBeVisible();
    // The list is always ascending by name, so the new mechanic is not necessarily the last row: target the
    // row that holds both its e-mail and a delete button.
    const deleteButtonName = /Delete mechanic|Szerelő törlése/i;
    const newMechanicRow = adminPage.rosterRows().filter({ hasText: newEmail });
    await newMechanicRow.getByRole('button', { name: deleteButtonName }).click();

    const deleteDialog = page.getByRole('dialog', { name: /Confirm mechanic deletion|Szerelő törlésének megerősítése/i });
    await expect(deleteDialog).toContainText(newEmail);
    await deleteDialog.getByRole('button', { name: /Delete|Törlés/i }).click();

    // The registration toast from the step above can still be on screen, so match the deletion
    // message rather than the email, which both toasts contain.
    await expect(toastMessage(page, /deleted successfully|sikeresen törölve/i)).toContainText(newEmail);
    await expect(mechanicsSection.getByText(newEmail, { exact: true })).toHaveCount(0);
  });
});

const MECHANIC_PAGE_SIZE = 5;
const SEEDED_MECHANIC_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Adds mechanics "Mech ZedA" ... "Mech ZedH" after the four fixture mechanics: twelve in all, pages of 5, 5 and 2. */
function seedMechanics(state: MockApiState): void {
  SEEDED_MECHANIC_LETTERS.forEach((letter, index) => {
    state.mechanics.push({
      personId: 9100 + index,
      firstName: 'Mech',
      middleName: null,
      lastName: `Zed${letter}`,
      email: `zed.${letter.toLowerCase()}@example.test`,
      phoneNumber: null,
      specialization: 'All',
      hasProfilePicture: false,
      isAdmin: false,
    });
  });
}

test.describe('Admin mechanic roster paging', () => {
  let adminPage: AdminPage;
  let rosterRequests: URL[] = [];

  test.beforeEach(async ({ page }) => {
    rosterRequests = recordGetRequests(page, '/api/admin/mechanics');
    ({ adminPage } = await AdminPage.open(page, { prepare: seedMechanics }));
    await expect(adminPage.pagination().indicator).toBeVisible();
  });

  test('shows five mechanics per page, ascending, with arrows and an indicator', async ({ page }) => {
    const { previous, next, indicator } = adminPage.pagination();
    const rosterEmail = (letter: string) => page.getByText(`zed.${letter}@example.test`, { exact: true });

    await expect(indicator).toHaveText('1 / 3');
    await expect(previous).toBeDisabled();
    await expect(page.getByText('gabor.kovacs@example.com', { exact: true })).toBeVisible();
    await expect(rosterEmail('a')).toBeVisible();
    await expect(rosterEmail('b')).toHaveCount(0);
    expect(rosterRequests.some((url) => url.searchParams.get('pageSize') === String(MECHANIC_PAGE_SIZE))).toBe(true);

    await next.click();
    await expect(indicator).toHaveText('2 / 3');
    await expect(rosterEmail('b')).toBeVisible();
    await expect(rosterEmail('f')).toBeVisible();
    await expect(rosterEmail('a')).toHaveCount(0);
    expect(rosterRequests.at(-1)?.searchParams.get('page')).toBe('2');

    await next.click();
    await expect(indicator).toHaveText('3 / 3');
    await expect(rosterEmail('g')).toBeVisible();
    await expect(rosterEmail('h')).toBeVisible();
    await expect(next).toBeDisabled();

    await previous.click();
    await expect(indicator).toHaveText('2 / 3');
  });

  test('searches on the server from page 1, and offers no sort toggle or sort parameter', async ({ page }) => {
    const { next, indicator } = adminPage.pagination();

    await expect(page.getByTestId('mechanic-sort-toggle')).toHaveCount(0);

    await next.click();
    await expect(indicator).toHaveText('2 / 3');
    await adminPage.searchInput().fill('Zed');
    await expect(indicator).toHaveText('1 / 2');
    await adminPage.searchInput().fill('zedc');

    await expect(indicator).toHaveText('1 / 1');
    await expect(page.getByText('zed.c@example.test', { exact: true })).toBeVisible();
    await expect(page.getByText('zed.d@example.test', { exact: true })).toHaveCount(0);
    expect(rosterRequests.some((url) => url.searchParams.get('search') === 'zedc')).toBe(true);
    expect(rosterRequests.some((url) => url.searchParams.has('sortDirection'))).toBe(false);
  });
});
