/** Quotes page helpers: form-state shapes, status-filter/validation mapping, and the live line preview (the only client-side amount calc; see CLAUDE.md). */

import { DEFAULT_VAT_RATE_PERCENT, type LaborTypeDto, type PartDto } from '../../types/catalog/catalog.types';
import {
  DEFAULT_QUOTE_VALIDITY_DAYS,
  type QuoteDetailDto,
  type QuoteLineDto,
  type QuoteLineKind,
  type QuoteListItemDto,
  type QuoteStatus,
} from '../../types/quotes/quotes.types';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';

/** Id in the key of a switched-off query: real ids start at 1, so that key is never fetched or shared with a record. */
export const IDLE_QUERY_ENTITY_ID = 0;

/** Status chips offered by the toolbar: the four stored values, the computed expiry, and no filter. */
export const QUOTE_STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Expired', 'Accepted', 'Rejected'] as const;

/** Selected toolbar status filter. */
export type QuoteStatusFilter = (typeof QUOTE_STATUS_FILTERS)[number];

/** Narrows a select value to a toolbar status filter. */
export function isQuoteStatusFilter(value: string): value is QuoteStatusFilter {
  return QUOTE_STATUS_FILTERS.some((filter) => filter === value);
}

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

/** Blank header form: what the editor holds while no quote is open. */
export const EMPTY_QUOTE_HEADER_FORM: QuoteHeaderFormState = {
  title: '',
  notes: '',
  validUntil: '',
  appointmentId: '',
};

/** Header fields the client rejected, as the i18n key of their error text; an absent field is valid. */
export interface QuoteHeaderFieldErrors {
  readonly title?: string;
}

/** Line fields the client rejected, as the i18n key of their error text; an absent field is valid. */
export interface QuoteLineFieldErrors {
  readonly quantity?: string;
  readonly description?: string;
  readonly netUnitPrice?: string;
}

/** Shared "nothing is invalid" results, so a form without errors hands out one stable object. */
export const NO_QUOTE_HEADER_FIELD_ERRORS: QuoteHeaderFieldErrors = {};
export const NO_QUOTE_LINE_FIELD_ERRORS: QuoteLineFieldErrors = {};

/** Converts a server timestamp to the `yyyy-MM-dd` value a date input needs. */
function toDateInputValue(isoValue: string): string {
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

/** Validates the header form; the title is the one field the client checks, the server owns the rest. */
export function validateQuoteHeaderForm(form: QuoteHeaderFormState): QuoteHeaderFieldErrors {
  return form.title.trim().length === 0 ? { title: 'quotes.errors.titleRequired' } : NO_QUOTE_HEADER_FIELD_ERRORS;
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

/** Validates the line form: a positive quantity, a description unless a catalog item is picked, and a typed or catalog price. */
export function validateQuoteLineForm(form: QuoteLineFormState): QuoteLineFieldErrors {
  const quantity = Number(form.quantity);
  const hasCatalogReference = form.catalogId.length > 0;
  const typedNetUnitPrice = form.netUnitPrice.trim();
  const errors: { quantity?: string; description?: string; netUnitPrice?: string } = {};

  if (Number.isNaN(quantity) || quantity <= 0) {
    errors.quantity = 'quotes.errors.invalidQuantity';
  }

  if (!hasCatalogReference && form.description.trim().length === 0) {
    errors.description = 'quotes.errors.lineFieldsRequired';
  }

  if (typedNetUnitPrice.length > 0 && Number.isNaN(Number(typedNetUnitPrice))) {
    errors.netUnitPrice = 'quotes.errors.invalidMoney';
  } else if (!hasCatalogReference && typedNetUnitPrice.length === 0) {
    errors.netUnitPrice = 'quotes.errors.lineFieldsRequired';
  }

  return errors;
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

/** Server filter for a toolbar chip: Expired is a Sent quote past its deadline (D7), and the Sent chip excludes it. */
export function toQuoteListFilter(filter: QuoteStatusFilter): { status?: QuoteStatus; expired?: boolean } {
  if (filter === 'All') {
    return {};
  }

  if (filter === 'Expired') {
    return { expired: true };
  }

  return filter === 'Sent' ? { status: filter, expired: false } : { status: filter };
}

/** Orders appointments newest first by scheduled date, later id first on a tie; the cached history keeps the server's ascending order. */
export function sortAppointmentsNewestFirst(appointments: readonly AppointmentDto[]): AppointmentDto[] {
  return [...appointments].sort(
    (left, right) => Date.parse(right.scheduledDate) - Date.parse(left.scheduledDate) || right.id - left.id,
  );
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
