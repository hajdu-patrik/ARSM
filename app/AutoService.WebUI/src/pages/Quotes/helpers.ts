/** Quotes page helpers: form-state shapes, filtering/validation mapping, and the live line preview (the only client-side amount calc; see CLAUDE.md). */

import { DEFAULT_VAT_RATE_PERCENT, type LaborTypeDto, type PartDto } from '../../types/catalog/catalog.types';
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

/** Converts a server timestamp to the `yyyy-MM-dd` value a date input needs. */
export function toDateInputValue(isoValue: string): string {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

/** Converts a `yyyy-MM-dd` input to the end of that UTC day (not midnight), since "valid through this day" would otherwise be instantly past. */
export function toValidUntilIso(dateInputValue: string): string {
  return new Date(`${dateInputValue}T23:59:59.000Z`).toISOString();
}

/** Formats a quote timestamp as a locale-aware date; quotes are dated by day, so time of day is never shown. */
export function formatQuoteDate(isoValue: string, locale: string): string {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Builds the header form for a new draft, with the default validity window pre-filled (D22). */
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

/** Builds the header form from a loaded quote. */
export function buildQuoteHeaderForm(quote: QuoteDetailDto): QuoteHeaderFormState {
  return {
    title: quote.title,
    notes: quote.notes ?? '',
    validUntil: toDateInputValue(quote.validUntil),
    appointmentId: quote.appointmentId === null ? '' : String(quote.appointmentId),
  };
}

/** Reports whether the header form differs from the saved quote; the validity deadline is excluded on purpose since it saves via its own action (D23). */
export function hasQuoteHeaderChanges(form: QuoteHeaderFormState, quote: QuoteDetailDto): boolean {
  const notes = form.notes.trim();

  return form.title.trim() !== quote.title || (notes.length > 0 ? notes : null) !== quote.notes;
}

/** Builds the line form from a saved line so the inline editor starts from its stored values. */
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

/** Picks the label set for a line kind: a part is in pieces at a unit price, labor in hours at an hourly rate (requirement 4). */
export function resolveLineLabelKeys(lineKind: QuoteLineKind): { quantityKey: string; unitPriceKey: string } {
  return lineKind === 'Labor'
    ? { quantityKey: 'quotes.line.hours', unitPriceKey: 'common.fields.hourlyNetRate' }
    : { quantityKey: 'quotes.line.quantity', unitPriceKey: 'common.fields.netUnitPrice' };
}

/** Applies a catalog selection to the line form, pre-filling snapshot fields while leaving them editable so an override still wins server-side. */
export function applyCatalogSelection(
  form: QuoteLineFormState,
  catalogId: string,
  parts: PartDto[],
  laborTypes: LaborTypeDto[],
): QuoteLineFormState {
  if (catalogId.length === 0) {
    return { ...form, catalogId };
  }

  const numericId = Number(catalogId);

  if (form.lineKind === 'Part') {
    const part = parts.find((candidate) => candidate.id === numericId);
    return part
      ? {
        ...form,
        catalogId,
        description: part.name,
        netUnitPrice: String(part.netUnitPrice),
        vatRatePercent: part.vatRatePercent,
      }
      : { ...form, catalogId };
  }

  const laborType = laborTypes.find((candidate) => candidate.id === numericId);
  return laborType
    ? {
      ...form,
      catalogId,
      description: laborType.name,
      netUnitPrice: String(laborType.hourlyNetRate),
      vatRatePercent: laborType.vatRatePercent,
    }
    : { ...form, catalogId };
}

/** Resolves the badge status; Expired comes from the server's isExpired flag, never a stored status, so the rule stays in one place (D7). */
export function resolveQuoteDisplayStatus(quote: Pick<QuoteListItemDto, 'status' | 'isExpired'>): QuoteDisplayStatus {
  return quote.isExpired ? 'Expired' : quote.status;
}

/** Applies the toolbar status filter to one quote. */
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

/** Removes accents and lowercases input to support accent-insensitive search. */
export function normalizeQuoteSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Matches a quote against the toolbar search term on quote number, title, and license plate. */
export function matchesQuoteSearch(quote: QuoteListItemDto, normalizedTerm: string): boolean {
  if (normalizedTerm.length === 0) {
    return true;
  }

  return normalizeQuoteSearchValue(quote.quoteNumber).includes(normalizedTerm)
    || normalizeQuoteSearchValue(quote.title).includes(normalizedTerm)
    || normalizeQuoteSearchValue(quote.vehicle.licensePlate).includes(normalizedTerm);
}

/** Live line-amount preview before the server line exists; mirrors `Pricing/QuoteLineCalculator` exactly (gross = net+vat, never a separate multiplication) — the only client-side amount calc (see CLAUDE.md). */
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

/** Hands a downloaded blob to the browser as a file; the object URL is revoked right after the click to avoid leaking memory for the document's lifetime. */
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
  [['vat rate must be'], 'common.validation.invalidVatRate'],
  [['status must be one of'], 'quotes.errors.invalidStatus'],
  [['linekind must be one of'], 'quotes.errors.invalidLineKind'],
];

/** Maps quote validation messages to i18n keys (backend detail from `Quotes/QuoteEndpoints.*.cs` and `Validation/QuoteValidation.cs`). */
export function mapQuoteValidationMessageToKey(message: string): string {
  const normalized = message.trim().toLowerCase();
  const matchedRule = QUOTE_VALIDATION_MESSAGE_RULES.find(
    ([fragments]) => fragments.some((fragment) => normalized.includes(fragment)),
  );

  return matchedRule ? matchedRule[1] : 'quotes.errors.saveFailed';
}
