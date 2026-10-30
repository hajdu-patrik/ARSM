/** Admin mechanic roster: which rows offer which actions, the empty, no-match and failed states, search
 * highlight, and mechanic deletion with every server refusal it maps. */
import { expect, test, type Page } from '@playwright/test';
import { AdminPage } from './pages/admin.page';
import { fulfillJson } from './support/api-mock-response';
import { MOCK_MECHANIC_IDS, type MockApiState } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

const RESET = 'Reset password';
const DELETE = 'Delete mechanic';
const ZED_A = 9100;
const ZED_B = 9101;

/** Adds the deletable mechanics "Mech ZedA" and "Mech ZedB", who sort after the four fixture mechanics. */
function seedZeds(state: MockApiState): void {
  for (const [index, letter] of ['A', 'B'].entries()) {
    state.mechanics.push({
      personId: ZED_A + index,
      firstName: 'Mech',
      middleName: null,
      lastName: `Zed${letter}`,
      email: `zed.${letter.toLowerCase()}@example.test`,
      phoneNumber: null,
      specialization: 'All',
      hasProfilePicture: false,
      isAdmin: false,
    });
  }
}

/** Makes every DELETE of a mechanic answer the given status and detail. */
async function refuseMechanicDelete(page: Page, status: number, detail: string): Promise<void> {
  await page.route((url) => /^\/api\/admin\/mechanics\/\d+$/.test(url.pathname), async (route) => {
    if (route.request().method() === 'DELETE') {
      await fulfillJson(route, { detail }, status);
      return;
    }
    await route.fallback();
  });
}

test.describe('Mechanic roster rows', () => {
  test('offers reset and delete on every mechanic row and neither on the admin row', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page);
    const adminRow = adminPage.rosterRow(MOCK_MECHANIC_IDS.admin);

    await expect(adminRow).toBeVisible();
    await expect(adminRow.getByRole('button')).toHaveCount(0);
    for (const personId of [MOCK_MECHANIC_IDS.gabor, MOCK_MECHANIC_IDS.peter, MOCK_MECHANIC_IDS.mate]) {
      await expect(adminPage.rosterRow(personId).getByRole('button', { name: RESET })).toBeVisible();
      await expect(adminPage.rosterRow(personId).getByRole('button', { name: DELETE })).toBeVisible();
    }
  });

  test('offers no delete when only one mechanic besides the admin is left, but still a reset', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page, {
      prepare: (state) => {
        const kept = state.mechanics.filter((mechanic) => mechanic.isAdmin || mechanic.personId === MOCK_MECHANIC_IDS.gabor);
        state.mechanics.splice(0, state.mechanics.length, ...kept);
      },
    });

    await expect(adminPage.rosterRows()).toHaveCount(2);
    await expect(adminPage.rosterRow(MOCK_MECHANIC_IDS.gabor).getByRole('button', { name: RESET })).toBeVisible();
    await expect(page.getByRole('button', { name: DELETE })).toHaveCount(0);
  });

  test('says so when no mechanic is registered, with no search field', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page, { prepare: (state) => { state.mechanics.length = 0; } });

    await expect(page.getByText('No mechanics registered yet.')).toBeVisible();
    await expect(adminPage.searchInput()).toHaveCount(0);
  });

  test('toasts a failed roster read', async ({ page }) => {
    await AdminPage.open(page, {
      prepare: async (_state, current) => {
        await current.route((url) => url.pathname === '/api/admin/mechanics', async (route) => {
          if (route.request().method() === 'GET') {
            await fulfillJson(route, { detail: 'Roster unavailable' }, 422);
            return;
          }
          await route.fallback();
        });
      },
    });

    await expect(errorToastMessage(page, 'Failed to load mechanic list.')).toBeVisible();
  });
});

test.describe('Mechanic roster search', () => {
  test('shows the no-match note with the search field kept, and the clear button brings the rows back', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page);

    await adminPage.searchInput().fill('zzzz');
    await expect(page.getByText('No mechanics match your search.')).toBeVisible();
    await expect(adminPage.rosterRows()).toHaveCount(0);
    await expect(adminPage.searchInput()).toBeVisible();

    await page.getByTestId('mechanic-search-clear').click();
    await expect(adminPage.searchInput()).toHaveValue('');
    await expect(adminPage.rosterRows()).toHaveCount(4);
  });

  test('colors the matching letters of the name and the e-mail', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page);

    await adminPage.searchInput().fill('nag');

    await expect(adminPage.rosterRows()).toHaveCount(1);
    const matches = adminPage.rosterRow(MOCK_MECHANIC_IDS.peter).locator('span.text-arsm-accent-vivid');
    await expect(matches).toHaveCount(2);
    await expect(matches.first()).toHaveText('Nag');
  });
});

test.describe('Delete mechanic', () => {
  test('names the mechanic, keeps the row on Cancel and removes it on confirm', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page, { prepare: seedZeds });
    await adminPage.rosterRow(ZED_A).getByRole('button', { name: DELETE }).click();
    const dialog = page.getByRole('dialog', { name: 'Confirm mechanic deletion' });

    await expect(dialog).toContainText('Are you sure you want to permanently delete Mech ZedA (zed.a@example.test)? This action cannot be undone.');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(adminPage.rosterRow(ZED_A)).toBeVisible();

    await adminPage.rosterRow(ZED_A).getByRole('button', { name: DELETE }).click();
    const request = page.waitForRequest((candidate) => candidate.method() === 'DELETE' && new URL(candidate.url()).pathname === `/api/admin/mechanics/${String(ZED_A)}`);
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await request;

    await expect(toastMessage(page, 'Mechanic "zed.a@example.test" deleted successfully.')).toBeVisible();
    await expect(adminPage.rosterRow(ZED_A)).toHaveCount(0);
  });

  test('steps back a page when the deleted mechanic was alone on the last page', async ({ page }) => {
    const { adminPage } = await AdminPage.open(page, { prepare: seedZeds });
    const { next, indicator } = adminPage.pagination();

    await expect(indicator).toHaveText('1 / 2');
    await next.click();
    await expect(indicator).toHaveText('2 / 2');
    await expect(adminPage.rosterRows()).toHaveCount(1);

    await adminPage.rosterRow(ZED_B).getByRole('button', { name: DELETE }).click();
    await page.getByRole('dialog', { name: 'Confirm mechanic deletion' }).getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(indicator).toHaveText('1 / 1');
    await expect(adminPage.rosterRows()).toHaveCount(5);
    await expect(adminPage.rosterRow(ZED_B)).toHaveCount(0);
  });

  const REFUSALS = [
    { status: 422, detail: 'Cannot delete this mechanic because one or more appointments would be left without assigned mechanics.', message: 'Cannot delete this mechanic because they are the sole assigned mechanic on one or more appointments.' },
    { status: 422, detail: 'Cannot delete the last remaining mechanic.', message: 'Cannot delete the last remaining mechanic.' },
    { status: 403, detail: 'Forbidden', message: 'You do not have permission to delete this mechanic.' },
    { status: 409, detail: 'Conflict', message: 'Deletion failed due to a conflict. Please try again.' },
    { status: 404, detail: 'Mechanic not found.', message: 'Failed to delete mechanic.' },
  ] as const;

  for (const { status, detail, message } of REFUSALS) {
    test(`toasts "${message}" for a ${String(status)} refusal and keeps the dialog and the row`, async ({ page }) => {
      const { adminPage } = await AdminPage.open(page, {
        prepare: async (state, current) => {
          seedZeds(state);
          await refuseMechanicDelete(current, status, detail);
        },
      });
      await adminPage.rosterRow(ZED_A).getByRole('button', { name: DELETE }).click();
      const dialog = page.getByRole('dialog', { name: 'Confirm mechanic deletion' });

      await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(errorToastMessage(page, message)).toBeVisible();
      await expect(dialog).toBeVisible();
      await expect(adminPage.rosterRow(ZED_A)).toBeVisible();
    });
  }
});
