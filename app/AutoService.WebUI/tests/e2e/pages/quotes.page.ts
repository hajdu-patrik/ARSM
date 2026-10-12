import { expect, type Locator, type Page } from '@playwright/test';
import { selectDropdownOption, selectDropdownOptionByLabel } from '../support/dropdown';
import { paginationControls, type PaginationControls } from '../support/pagination';

export type QuoteStatusFilterOption = 'All' | 'Draft' | 'Sent' | 'Expired' | 'Accepted' | 'Rejected';
export type QuoteLineKindOption = 'part' | 'labor';

/** Page object for the Quotes list and the quote editor dialog. */
export class QuotesPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/quotes');
    // A test id rather than the heading text, so this readiness wait works
    // regardless of the UI language the page renders in.
    await expect(this.searchInput()).toBeVisible();
  }

  searchInput(): Locator {
    return this.page.getByTestId('quotes-search-input');
  }

  searchClearButton(): Locator {
    return this.page.getByTestId('quotes-search-clear');
  }

  statusFilter(): Locator {
    return this.page.getByTestId('quotes-status-filter');
  }

  pagination(): PaginationControls {
    return paginationControls(this.page, 'quotes-pagination');
  }

  rows(): Locator {
    return this.page.getByTestId('quote-row');
  }

  /** The row whose quote number matches, regardless of the current filter. */
  row(quoteNumber: string): Locator {
    return this.rows().filter({ hasText: quoteNumber });
  }

  /** A control of the row: `DataListRow` renders each row once, as a table row or as tiles. */
  rowAction(quoteNumber: string, testId: string): Locator {
    return this.row(quoteNumber).getByTestId(testId);
  }

  statusBadge(quoteNumber: string): Locator {
    return this.rowAction(quoteNumber, 'quote-status-badge');
  }

  lineAction(index: number, testId: string): Locator {
    return this.lineRows().nth(index).getByTestId(testId);
  }

  editorDialog(): Locator {
    return this.page.getByRole('dialog').first();
  }

  /** Anchored per language, so it never also matches the dialog chrome's "Close dialog" control
   * (both share the word "Close" in English). */
  closeEditorButton(): Locator {
    return this.page.getByRole('button', { name: /^(Close|Bezárás)$/ });
  }

  lineRows(): Locator {
    return this.page.getByTestId('quote-line-row');
  }

  totalNet(): Locator {
    return this.page.getByTestId('quote-total-net');
  }

  totalVat(): Locator {
    return this.page.getByTestId('quote-total-vat');
  }

  totalGross(): Locator {
    return this.page.getByTestId('quote-total-gross');
  }

  async filterByStatus(option: QuoteStatusFilterOption): Promise<void> {
    await selectDropdownOption(this.page, 'quotes-status-filter', option);
  }

  /** Opens the editor for the quote with this quote number. */
  async openQuote(quoteNumber: string): Promise<Locator> {
    await this.rowAction(quoteNumber, 'quote-open-button').click();
    const dialog = this.editorDialog();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('quote-totals')).toBeVisible();
    return dialog;
  }

  /** Starts a new draft from the vehicle row of an expanded customer card. */
  async startQuoteFromVehicle(customerId: number, index = 0): Promise<Locator> {
    await this.page.getByTestId(`customer-card-${String(customerId)}`).getByTestId('vehicle-create-quote-button').nth(index).click();
    await this.page.waitForURL(/\/quotes/);
    const dialog = this.page.getByRole('dialog', { name: 'New quote' });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Fills the add-line form and saves it, returning once the row count settles. */
  async addLine(options: {
    kind: QuoteLineKindOption;
    catalogLabel?: string;
    description?: string;
    quantity: string;
    netUnitPrice?: string;
  }): Promise<void> {
    const expectedRows = await this.lineRows().count() + 1;
    await this.page.getByTestId('quote-add-line-button').click();

    const editor = this.page.getByTestId('quote-line-editor');
    await expect(editor).toBeVisible();
    await editor.getByTestId(`quote-line-kind-${options.kind}`).click();

    if (options.catalogLabel) {
      await selectDropdownOptionByLabel(this.page, editor.getByTestId('quote-line-catalog-select'), options.catalogLabel);
    }

    if (options.description !== undefined) {
      await editor.getByTestId('quote-line-description-input').fill(options.description);
    }

    await editor.getByTestId('quote-line-quantity-input').fill(options.quantity);

    if (options.netUnitPrice !== undefined) {
      await editor.getByTestId('quote-line-net-price-input').fill(options.netUnitPrice);
    }

    await editor.getByTestId('quote-line-save-button').click();
    await expect(this.lineRows()).toHaveCount(expectedRows);
  }
}
