/** Inventory edges: the live gross preview rounds half a cent up, a failing list read toasts once per failure
 * episode, and an edit or delete of an item that is already gone reloads the list and closes the dialog. */
import { expect, test } from '@playwright/test';
import { CatalogPage, type CatalogItemKind, type CatalogTab } from './pages/catalog.page';
import { refuseApiRoute } from './support/appointment-route-overrides';
import { dismissToasts } from './support/appointment-ui';
import { selectDropdownOption } from './support/dropdown';
import { recordGetRequests } from './support/request-log';
import { refocusTab } from './support/refocus-tab';
import { signInWithMocks } from './support/sign-in';
import { MOCK_LABOR_TYPE_IDS, MOCK_PART_IDS, type MockApiState } from './support/test-data';
import { errorToastMessage } from './support/toast';

/** Lets a late toast of the last failed read show up before the toast count is read. */
const SETTLE_MS = 500;
const READ_TIMEOUT_MS = 10_000;

interface ItemCase {
  readonly kind: CatalogItemKind;
  readonly tab: CatalogTab;
  readonly listPath: string;
  readonly loadFailedMessage: string;
  readonly notFoundMessage: string;
  readonly editTitle: string;
  readonly deleteTitle: string;
  readonly deleteButton: string;
  readonly removeFirstItem: (state: MockApiState) => void;
}

/** Removes the item from the mock state, the way another user's delete would. */
function removeById(items: Array<{ id: number }>, id: number): void {
  const index = items.findIndex((item) => item.id === id);

  if (index >= 0) {
    items.splice(index, 1);
  }
}

const ITEM_CASES: readonly ItemCase[] = [
  {
    kind: 'part',
    tab: 'parts',
    listPath: '/api/parts',
    loadFailedMessage: 'Failed to load parts.',
    notFoundMessage: 'Part not found.',
    editTitle: 'Edit part',
    deleteTitle: 'Confirm part deletion',
    deleteButton: 'Delete part',
    removeFirstItem: (state) => {
      removeById(state.parts, MOCK_PART_IDS.timingBelt);
    },
  },
  {
    kind: 'laborType',
    tab: 'labor-types',
    listPath: '/api/labor-types',
    loadFailedMessage: 'Failed to load labour types.',
    notFoundMessage: 'Labour type not found.',
    editTitle: 'Edit labour type',
    deleteTitle: 'Confirm labour type deletion',
    deleteButton: 'Delete labour type',
    removeFirstItem: (state) => {
      removeById(state.laborTypes, MOCK_LABOR_TYPE_IDS.diagnostics);
    },
  },
];

test.describe('Inventory - gross preview rounding', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('a part at 4.30 net and 5% VAT previews 4.52 gross', async ({ page }) => {
    await signInWithMocks(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('parts');

    const dialog = await catalog.openCreate('part');
    await dialog.getByLabel('Net unit price').fill('4.30');
    await selectDropdownOption(page, 'part-vat-rate', '5');

    await expect(dialog.getByLabel('Gross unit price (preview)')).toHaveValue(/4\.52$/);
  });

  test('a labour type at 4.30 net and 5% VAT previews 4.52 gross', async ({ page }) => {
    await signInWithMocks(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('labor-types');

    const dialog = await catalog.openCreate('laborType');
    await dialog.getByLabel('Hourly rate (net)').fill('4.30');
    await selectDropdownOption(page, 'labor-type-vat-rate', '5');

    await expect(dialog.getByLabel('Gross hourly rate (preview)')).toHaveValue(/4\.52$/);
  });
});

for (const itemCase of ITEM_CASES) {
  test.describe(`Inventory edge cases - ${itemCase.tab}`, () => {
    test.use({ viewport: { width: 1280, height: 1000 } });

    test('a failing list read toasts once, stays quiet while it goes on and toasts again after a success', async ({ page }) => {
      const reads = recordGetRequests(page, itemCase.listPath);
      await signInWithMocks(page);
      const refusal = await refuseApiRoute(page, itemCase.listPath, 'GET', 400, { detail: 'Refused.' });
      const catalog = new CatalogPage(page);
      const failureToast = errorToastMessage(page, itemCase.loadFailedMessage);

      await catalog.goto(itemCase.tab);
      await expect(failureToast).toHaveCount(1);

      // A read is tried twice (one retry) before it counts as failed again.
      const readsBefore = reads.length;
      await refocusTab(page);
      await expect.poll(() => reads.length, { timeout: READ_TIMEOUT_MS }).toBeGreaterThanOrEqual(readsBefore + 2);
      await page.waitForTimeout(SETTLE_MS);
      await expect(failureToast).toHaveCount(1);

      refusal.lift();
      await refocusTab(page);
      await expect(page.getByTestId('catalog-item-row')).toHaveCount(2);
      await dismissToasts(page);

      refusal.restore();
      await catalog.searchInput(itemCase.kind).fill('zzz-no-such-item');
      await expect(failureToast).toHaveCount(1);
    });

    test('an edit of an item that was deleted meanwhile reloads the list, closes the dialog and says so', async ({ page }) => {
      const state = await signInWithMocks(page);
      const catalog = new CatalogPage(page);
      await catalog.goto(itemCase.tab);
      const dialog = await catalog.openEdit(itemCase.kind, 0);

      itemCase.removeFirstItem(state);
      await dialog.getByLabel('Name').fill('Renamed after it was gone');
      await dialog.getByRole('button', { name: 'Save' }).click();

      await expect(errorToastMessage(page, itemCase.notFoundMessage)).toBeVisible();
      await expect(catalog.formDialog(itemCase.editTitle)).toHaveCount(0);
      await expect(page.getByTestId('catalog-item-row')).toHaveCount(1);
    });

    test('a delete of an item that was deleted meanwhile reloads the list, closes the dialog and says so', async ({ page }) => {
      const state = await signInWithMocks(page);
      const catalog = new CatalogPage(page);
      await catalog.goto(itemCase.tab);
      const dialog = await catalog.openDelete(itemCase.kind, 0);

      itemCase.removeFirstItem(state);
      await dialog.getByRole('button', { name: itemCase.deleteButton }).click();

      await expect(errorToastMessage(page, itemCase.notFoundMessage)).toBeVisible();
      await expect(catalog.formDialog(itemCase.deleteTitle)).toHaveCount(0);
      await expect(page.getByTestId('catalog-item-row')).toHaveCount(1);
    });
  });
}
