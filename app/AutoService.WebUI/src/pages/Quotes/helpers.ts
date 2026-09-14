/**
 * Quotes page helper utilities.
 *
 * Owns the form-state shapes, the date-input conversions, the search and
 * status filtering rules, the validation-message mapping, and the one
 * permitted client-side amount computation (the live line preview).
 * @module pages/Quotes/helpers
 */

import { DEFAULT_VAT_RATE_PERCENT } from '../../types/catalog/catalog.types';
import {
  DEFAULT_QUOTE_VALIDITY_DAYS,
  type QuoteDetailDto,
  type QuoteLineDto,
  type QuoteLineKind,
  type QuoteListItemDto,
  type QuoteStatus,
} from '../../types/quotes/quotes.types';

/** Status chips offered by the toolbar: the four stored values, the computed expiry, and no filter. */
export const QUOTE_STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Expired', 'Accepted', 'Rejected'] as const;

/** Selected toolbar status filter. */
export type QuoteStatusFilter = (typeof QUOTE_STATUS_FILTERS)[number];

/** What the badge shows: the stored status, or Expired for a sent quote past its deadline. */
export type QuoteDisplayStatus = QuoteStatus | 'Expired';

/** Whether the editor is creating a new draft or working on an existing quote. */
export type QuoteEditorMode = 'create' | 'edit';

/** Quote header form state; every field is a string because it is bound to an input. */
export interface QuoteHeaderFormState {
  title: string;
  notes: string;
  validUntil: string;
  appointmentId: string;
}

/** Quote line form state shared by the add form and the inline row editor. */
export interface QuoteLineFormState {
  lineKind: QuoteLineKind;
  catalogId: string;
  description: string;
  quantity: string;
  netUnitPrice: string;
  vatRatePercent: number;
}

/** Empty line form used when starting a new part line. */
export const EMPTY_QUOTE_LINE_FORM: QuoteLineFormState = {
  lineKind: 'Part',
  catalogId: '',
  description: '',
  quantity: '1',
  netUnitPrice: '',
  vatRatePercent: DEFAULT_VAT_RATE_PERCENT,
};

/**
 * Converts a server timestamp to the `yyyy-MM-dd` value a date input needs.
 * @param isoValue ISO timestamp from the API.
 * @returns Date-input value, or an empty string when the timestamp is unusable.
 */
export function toDateInputValue(isoValue: string): string {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Converts a `yyyy-MM-dd` date input value to the instant the API stores.
 *
 * The deadline lands on the END of the chosen day in UTC, because the field
 * means "valid through this day": midnight would make today's date instantly
 * past and the server would reject it as a past deadline.
 * @param dateInputValue Date-input value in `yyyy-MM-dd` form.
 * @returns ISO timestamp at the end of that day in UTC.
 */
export function toValidUntilIso(dateInputValue: string): string {
  return new Date(`${dateInputValue}T23:59:59.000Z`).toISOString();
}

/**
 * Formats a quote timestamp as a locale-aware date. Quotes are dated by day
 * (created on, valid until), so the time of day is never shown.
 * @param isoValue ISO timestamp from the API.
 * @param locale Current i18n locale.
 * @returns Human-readable date text, or a dash when the timestamp is unusable.
 */
export function formatQuoteDate(isoValue: string, locale: string): string {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/**
 * Builds the header form for a new draft, with the default validity window (D22).
 * @returns Empty header form with ValidUntil pre-filled to today plus 30 days.
 */
export function buildDefaultQuoteHeaderForm(): QuoteHeaderFormState {
  const validUntil = new Date();
  validUntil.setUTCDate(validUntil.getUTCDate() + DEFAULT_QUOTE_VALIDITY_DAYS);

  return {
    title: '',
    notes: '',
    validUntil: validUntil.toISOString().slice(0, 10),
    appointmentId: '',
  };
}

/**
 * Builds the header form from a loaded quote.
 * @param quote Quote currently open in the editor.
 * @returns Header form state mirroring the quote.
 */
export function buildQuoteHeaderForm(quote: QuoteDetailDto): QuoteHeaderFormState {
  return {
    title: quote.title,
    notes: quote.notes ?? '',
    validUntil: toDateInputValue(quote.validUntil),
    appointmentId: quote.appointmentId === null ? '' : String(quote.appointmentId),
  };
}

/**
 * Reports whether the header form differs from the saved quote. The validity
 * deadline is excluded on purpose: it is saved by its own action, so a
 * pending date change must not enable the header save button (D23).
 * @param form Current header form state.
 * @param quote Quote currently open in the editor.
 * @returns True when the title or the notes changed.
 */
export function hasQuoteHeaderChanges(form: QuoteHeaderFormState, quote: QuoteDetailDto): boolean {
  const notes = form.notes.trim();

  return form.title.trim() !== quote.title || (notes.length > 0 ? notes : null) !== quote.notes;
}

/**
 * Builds the line form from a saved line so the inline editor starts from its stored values.
 * @param line Line being edited.
 * @returns Line form state mirroring the line.
 */
export function buildQuoteLineForm(line: QuoteLineDto): QuoteLineFormState {
  const catalogId = line.lineKind === 'Part' ? line.partId : line.laborTypeId;

  return {
    lineKind: line.lineKind,
    catalogId: catalogId === null ? '' : String(catalogId),
    description: line.description,
    quantity: String(line.quantity),
    netUnitPrice: String(line.netUnitPrice),
    vatRatePercent: line.vatRatePercent,
  };
}

/**
 * Resolves the badge state of a quote. Expired comes from the server's
 * computed `isExpired` flag, never from a stored status, so the rule stays in
 * exactly one place (D7).
 * @param quote Quote list row or detail.
 * @returns The status the badge should display.
 */
export function resolveQuoteDisplayStatus(quote: Pick<QuoteListItemDto, 'status' | 'isExpired'>): QuoteDisplayStatus {
  return quote.isExpired ? 'Expired' : quote.status;
}

/**
 * Applies the toolbar status filter to one quote.
 * @param quote Quote list row.
 * @param filter Selected status filter.
 * @returns True when the quote passes the filter.
 */
export function matchesQuoteStatusFilter(quote: QuoteListItemDto, filter: QuoteStatusFilter): boolean {
  if (filter === 'All') {
    return true;
  }

  if (filter === 'Expired') {
    return quote.isExpired;
  }

  // An expired quote answers to the Expired chip only, so the Sent and
  // Expired chips never list the same row.
  return quote.status === filter && !quote.isExpired;
}

/**
 * Removes accents and lowercases input to support accent-insensitive search.
 * @param value Raw input value.
 * @returns Normalized value suitable for contains matching.
 */
export function normalizeQuoteSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Matches a quote against the toolbar search term on quote number, title, and license plate.
 * @param quote Quote list row.
 * @param normalizedTerm Already normalized search term.
 * @returns True when the quote matches.
 */
export function matchesQuoteSearch(quote: QuoteListItemDto, normalizedTerm: string): boolean {
  if (normalizedTerm.length === 0) {
    return true;
  }

  return normalizeQuoteSearchValue(quote.quoteNumber).includes(normalizedTerm)
    || normalizeQuoteSearchValue(quote.title).includes(normalizedTerm)
    || normalizeQuoteSearchValue(quote.vehicle.licensePlate).includes(normalizedTerm);
}

/**
 * Computes the live line-amount preview shown while typing, before a
 * server-authoritative line exists. It mirrors the server formula exactly
 * (`Pricing/QuoteLineCalculator`): the net amount rounds to 2 decimals, the
 * VAT amount rounds the net-based tax to 2 decimals, and gross is their sum
 * rather than a separate multiplication.
 *
 * This is the only client-side amount computation on the page. Every amount
 * shown on a saved line, and every total, comes from the server DTO.
 * @param quantity Quantity currently typed in the form.
 * @param netUnitPrice Net unit price or hourly rate currently typed in the form.
 * @param vatRatePercent Selected VAT rate percentage.
 * @returns The previewed net, VAT, and gross amounts.
 */
export function computeQuoteLineAmountsPreview(
  quantity: number,
  netUnitPrice: number,
  vatRatePercent: number,
): { netAmount: number; vatAmount: number; grossAmount: number } {
  if (Number.isNaN(quantity) || Number.isNaN(netUnitPrice)) {
    return { netAmount: 0, vatAmount: 0, grossAmount: 0 };
  }

  const netAmount = Math.round(quantity * netUnitPrice * 100) / 100;
  const vatAmount = Math.round(((netAmount * vatRatePercent) / 100) * 100) / 100;

  return { netAmount, vatAmount, grossAmount: netAmount + vatAmount };
}

/**
 * Hands a downloaded blob to the browser as a file.
 *
 * The object URL is revoked right after the click, because the blob would
 * otherwise stay in memory for the lifetime of the document.
 * @param blob File content returned by the API.
 * @param fileName Name to save the file under.
 */
export function saveBlobAsFile(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Ordered validation-message fragments mapped to their Quotes page i18n keys. */
const QUOTE_VALIDATION_MESSAGE_RULES: ReadonlyArray<readonly [readonly string[], string]> = [
  [['title cannot be empty'], 'quotes.errors.titleRequired'],
  [['title must be at most'], 'quotes.errors.titleTooLong'],
  [['notes must be at most'], 'quotes.errors.notesTooLong'],
  [['description must be at most'], 'quotes.errors.descriptionTooLong'],
  [['validuntil cannot be in the past'], 'quotes.errors.validUntilInPast'],
  [['validuntil can only be extended'], 'quotes.errors.validUntilNotLater'],
  [['validity cannot be changed on a decided quote'], 'quotes.errors.validityLocked'],
  [['cannot contain more than'], 'quotes.errors.lineLimitExceeded'],
  [['at least one line before it can be sent'], 'quotes.errors.sendNeedsLine'],
  [['cannot transition a quote'], 'quotes.errors.statusTransitionNotAllowed'],
  [['only draft quotes can', 'while the quote is a draft'], 'quotes.errors.draftOnly'],
  [['are required when no catalog reference'], 'quotes.errors.lineFieldsRequired'],
  [['cannot reference a labor type', 'cannot reference a part'], 'quotes.errors.lineKindMismatch'],
  [['appointment does not belong'], 'quotes.errors.appointmentVehicleMismatch'],
  [['appointment not found'], 'quotes.errors.appointmentNotFound'],
  [['vehicle not found'], 'quotes.errors.vehicleNotFound'],
  [['quote line not found'], 'quotes.errors.lineNotFound'],
  [['quote not found'], 'quotes.errors.quoteNotFound'],
  [['part not found'], 'quotes.errors.partNotFound'],
  [['labor type not found'], 'quotes.errors.laborTypeNotFound'],
  [['version is required'], 'quotes.errors.versionRequired'],
  [['quantity must be'], 'quotes.errors.invalidQuantity'],
  [['amount must be at least'], 'quotes.errors.invalidMoney'],
  [['vat rate must be'], 'quotes.errors.invalidVatRate'],
  [['status must be one of'], 'quotes.errors.invalidStatus'],
  [['linekind must be one of'], 'quotes.errors.invalidLineKind'],
];

/**
 * Maps quote validation messages to i18n keys.
 * @param message Backend error detail (see `Quotes/QuoteEndpoints.*.cs` and `Validation/QuoteValidation.cs`).
 * @returns Quotes page i18n key.
 */
export function mapQuoteValidationMessageToKey(message: string): string {
  const normalized = message.trim().toLowerCase();
  const matchedRule = QUOTE_VALIDATION_MESSAGE_RULES.find(
    ([fragments]) => fragments.some((fragment) => normalized.includes(fragment)),
  );

  return matchedRule ? matchedRule[1] : 'quotes.errors.saveFailed';
}
