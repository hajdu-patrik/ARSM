import { expect, type Locator, type Page } from '@playwright/test';

export type CatalogTab = 'parts' | 'labor-types';
export type CatalogItemKind = 'part' | 'laborType';

// Anchored per language: the tabs have no test id of their own, and
// the Inventory page has no other control whose accessible name collides.
const TAB_LABEL: Record<CatalogTab, RegExp> = {
  parts: /^(Parts|Alkatrészek)$/,
  'labor-types': /^(Labour types|Munkadíjtípusok)$/,
};
const CREATE_TITLE: Record<CatalogItemKind, string> = { part: 'Create part', laborType: 'Create labour type' };
const EDIT_TITLE: Record<CatalogItemKind, string> = { part: 'Edit part', laborType: 'Edit labour type' };
const DELETE_TITLE: Record<CatalogItemKind, string> = {
  part: 'Confirm part deletion',
  laborType: 'Confirm labour type deletion',
};
const EDIT_LABEL: Record<CatalogItemKind, string> = { part: 'Edit part', laborType: 'Edit labour type' };
const DELETE_LABEL: Record<CatalogItemKind, string> = { part: 'Delete part', laborType: 'Delete labour type' };
const TOOLBAR_TESTID_PREFIX: Record<CatalogItemKind, string> = {
  part: 'inventory-parts',
  laborType: 'inventory-labor-types',
};

/** Page object for the Inventory page: parts and labour types tabs. */
export class CatalogPage {
  constructor(private readonly page: Page) {}

  async goto(tab?: CatalogTab): Promise<void> {
    await this.page.goto(tab ? `/inventory?tab=${tab}` : '/inventory');
    // A test id rather than the heading text, so this readiness wait works
    // regardless of the UI language the page renders in.
    const activeKind: CatalogItemKind = tab === 'labor-types' ? 'laborType' : 'part';
    await expect(this.searchInput(activeKind)).toBeVisible();
  }

  /** The tab of the page's `tablist`; the active one has `aria-selected="true"`. */
  tab(name: CatalogTab): Locator {
    return this.page.getByRole('tab', { name: TAB_LABEL[name] });
  }

  searchInput(kind: CatalogItemKind): Locator {
    return this.page.getByTestId(`${TOOLBAR_TESTID_PREFIX[kind]}-search-input`);
  }

  searchClearButton(kind: CatalogItemKind): Locator {
    return this.page.getByTestId(`${TOOLBAR_TESTID_PREFIX[kind]}-search-clear`);
  }

  sortToggle(kind: CatalogItemKind): Locator {
    return this.page.getByTestId(`${TOOLBAR_TESTID_PREFIX[kind]}-sort-toggle`);
  }

  createButton(kind: CatalogItemKind): Locator {
    return this.page.getByTestId(`${TOOLBAR_TESTID_PREFIX[kind]}-create-button`);
  }

  /** All visible edit buttons for the given entity kind, in row/document order. */
  editButtons(kind: CatalogItemKind): Locator {
    return this.page.getByRole('button', { name: EDIT_LABEL[kind] });
  }

  /** All visible delete buttons for the given entity kind, in row/document order. */
  deleteButtons(kind: CatalogItemKind): Locator {
    return this.page.getByRole('button', { name: DELETE_LABEL[kind] });
  }

  formDialog(title: string): Locator {
    return this.page.getByRole('dialog', { name: title });
  }

  async openCreate(kind: CatalogItemKind): Promise<Locator> {
    await this.createButton(kind).click();
    const dialog = this.formDialog(CREATE_TITLE[kind]);
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Opens the edit modal for the row at `index` in the current sorted/filtered list. */
  async openEdit(kind: CatalogItemKind, index: number): Promise<Locator> {
    await this.editButtons(kind).nth(index).click();
    const dialog = this.formDialog(EDIT_TITLE[kind]);
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Opens the delete confirmation for the row at `index` in the current sorted/filtered list. */
  async openDelete(kind: CatalogItemKind, index: number): Promise<Locator> {
    await this.deleteButtons(kind).nth(index).click();
    const dialog = this.formDialog(DELETE_TITLE[kind]);
    await expect(dialog).toBeVisible();
    return dialog;
  }
}
