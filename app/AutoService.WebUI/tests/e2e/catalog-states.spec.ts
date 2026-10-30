/** Inventory states around the forms: empty and failed lists, a cancelled or failed delete, and the tab
 * strip (roving tabindex, Home/End/arrow wrap, modifier keys, an unknown tab value). */
import { expect, test } from '@playwright/test';
import { CatalogPage, type CatalogItemKind, type CatalogTab } from './pages/catalog.page';
import { fulfillJson } from './support/api-mock-response';
import { signInWithMocks } from './support/sign-in';
import { errorToastMessage } from './support/toast';

interface StateCase {
  readonly kind: CatalogItemKind;
  readonly tab: CatalogTab;
  readonly listPath: string;
  readonly itemPath: RegExp;
  readonly emptyMessage: string;
  readonly loadFailedMessage: string;
  readonly deleteFailedMessage: string;
  readonly deleteTitle: string;
}

const STATE_CASES: readonly StateCase[] = [
  {
    kind: 'part',
    tab: 'parts',
    listPath: '/api/parts',
    itemPath: /^\/api\/parts\/\d+$/,
    emptyMessage: 'No parts match your current filter.',
    loadFailedMessage: 'Failed to load parts.',
    deleteFailedMessage: 'Failed to delete part.',
    deleteTitle: 'Confirm part deletion',
  },
  {
    kind: 'laborType',
    tab: 'labor-types',
    listPath: '/api/labor-types',
    itemPath: /^\/api\/labor-types\/\d+$/,
    emptyMessage: 'No labour types match your current filter.',
    loadFailedMessage: 'Failed to load labour types.',
    deleteFailedMessage: 'Failed to delete labour type.',
    deleteTitle: 'Confirm labour type deletion',
  },
];

for (const stateCase of STATE_CASES) {
  test.describe(`Inventory states - ${stateCase.tab}`, () => {
    test.use({ viewport: { width: 1280, height: 1000 } });

    test('a search without a match shows the empty state, and clearing it brings the rows back', async ({ page }) => {
      await signInWithMocks(page);
      const catalog = new CatalogPage(page);
      const rows = page.getByTestId('catalog-item-row');
      await catalog.goto(stateCase.tab);
      await expect(rows).toHaveCount(2);

      await catalog.searchInput(stateCase.kind).fill('zzz-no-such-item');
      await expect(page.getByText(stateCase.emptyMessage)).toBeVisible();
      await expect(rows).toHaveCount(0);

      await catalog.searchClearButton(stateCase.kind).click();
      await expect(rows).toHaveCount(2);
    });

    test('a list that cannot be loaded toasts the failure', async ({ page }) => {
      await signInWithMocks(page);
      await page.route((url) => url.pathname === stateCase.listPath, (route) => fulfillJson(route, { detail: 'Rejected.' }, 400));
      const catalog = new CatalogPage(page);

      await catalog.goto(stateCase.tab);

      await expect(errorToastMessage(page, stateCase.loadFailedMessage)).toBeVisible();
    });

    test('cancelling the delete confirmation sends no delete and keeps the rows', async ({ page }) => {
      await signInWithMocks(page);
      const deletes: string[] = [];
      page.on('request', (request) => {
        if (request.method() === 'DELETE' && stateCase.itemPath.test(new URL(request.url()).pathname)) {
          deletes.push(request.url());
        }
      });
      const catalog = new CatalogPage(page);
      await catalog.goto(stateCase.tab);

      const dialog = await catalog.openDelete(stateCase.kind, 0);
      await dialog.getByRole('button', { name: 'Cancel' }).click();

      await expect(catalog.formDialog(stateCase.deleteTitle)).toHaveCount(0);
      await expect(page.getByTestId('catalog-item-row')).toHaveCount(2);
      expect(deletes).toHaveLength(0);
    });

    test('a delete the server refuses toasts the failure and does not drop the row', async ({ page }) => {
      await signInWithMocks(page);
      await page.route((url) => stateCase.itemPath.test(url.pathname), async (route) => {
        if (route.request().method() !== 'DELETE') {
          await route.fallback();
          return;
        }

        await fulfillJson(route, { detail: 'Not found.' }, 404);
      });
      const catalog = new CatalogPage(page);
      await catalog.goto(stateCase.tab);

      const dialog = await catalog.openDelete(stateCase.kind, 0);
      await dialog.getByRole('button', { name: /^Delete (part|labour type)$/ }).click();

      await expect(errorToastMessage(page, stateCase.deleteFailedMessage)).toBeVisible();
      await expect(page.getByTestId('catalog-item-row')).toHaveCount(2);
    });
  });
}

test.describe('Inventory tab strip', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('only the active tab is a tab stop, and the panel is named by it', async ({ page }) => {
    await signInWithMocks(page);
    const catalog = new CatalogPage(page);
    await catalog.goto();

    await expect(catalog.tab('parts')).toHaveAttribute('tabindex', '0');
    await expect(catalog.tab('labor-types')).toHaveAttribute('tabindex', '-1');
    await expect(page.getByRole('tabpanel', { name: 'Parts' })).toBeVisible();

    await catalog.tab('labor-types').click();
    await expect(catalog.tab('labor-types')).toHaveAttribute('tabindex', '0');
    await expect(page.getByRole('tabpanel', { name: 'Labour types' })).toBeVisible();
  });

  test('the arrows wrap around and Home and End jump to the ends', async ({ page }) => {
    await signInWithMocks(page);
    const catalog = new CatalogPage(page);
    await catalog.goto();

    await catalog.tab('parts').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/\/inventory\?tab=labor-types$/);
    await expect(catalog.tab('labor-types')).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/inventory\?tab=parts$/);
    await expect(catalog.tab('parts')).toBeFocused();

    await page.keyboard.press('End');
    await expect(catalog.tab('labor-types')).toBeFocused();
    await expect(catalog.tab('labor-types')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Home');
    await expect(catalog.tab('parts')).toBeFocused();
    await expect(catalog.tab('parts')).toHaveAttribute('aria-selected', 'true');
  });

  test('a key with a modifier does not move the tab', async ({ page }) => {
    await signInWithMocks(page);
    const catalog = new CatalogPage(page);
    await catalog.goto();

    await catalog.tab('parts').focus();
    await page.keyboard.press('Shift+ArrowRight');

    await expect(catalog.tab('parts')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/\/inventory$/);
  });

  test('an unknown tab value shows the Parts tab', async ({ page }) => {
    await signInWithMocks(page);
    const catalog = new CatalogPage(page);

    await page.goto('/inventory?tab=bogus');

    await expect(catalog.searchInput('part')).toBeVisible();
    await expect(catalog.tab('parts')).toHaveAttribute('aria-selected', 'true');
    await expect(catalog.tab('labor-types')).toHaveAttribute('aria-selected', 'false');
  });
});
