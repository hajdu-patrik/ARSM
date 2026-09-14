/** Quote contracts used by the Quotes page (see `Quotes/QuoteEndpoints.Contracts.cs`). */

/** Stored quote statuses; `Expired` is never one of them (it is the computed `isExpired` flag). */
export const QUOTE_STATUSES = ['Draft', 'Sent', 'Accepted', 'Rejected'] as const;

/** Stored quote status as a string literal union. */
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Quote line kinds, matching the backend `QuoteLineKind` enum. */
export const QUOTE_LINE_KINDS = ['Part', 'Labor'] as const;

/** Quote line kind as a string literal union. */
export type QuoteLineKind = (typeof QUOTE_LINE_KINDS)[number];

/** Maximum lines a single quote accepts, matching `QuoteValidation.MaxLineCount`. */
export const MAX_QUOTE_LINE_COUNT = 200;

/** Maximum quote title length, matching `QuoteValidation.MaxTitleLength`. */
export const MAX_QUOTE_TITLE_LENGTH = 120;

/** Maximum quote notes length, matching `QuoteEndpoints.MaxNotesLength`. */
export const MAX_QUOTE_NOTES_LENGTH = 1000;

/** Maximum line description length, matching `QuoteEndpoints.MaxLineDescriptionLength`. */
export const MAX_QUOTE_LINE_DESCRIPTION_LENGTH = 120;

/** Default validity window applied to a new quote, matching the server default (D22). */
export const DEFAULT_QUOTE_VALIDITY_DAYS = 30;

/** Vehicle the quote is anchored to. */
export interface QuoteVehicleSummaryDto {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
}

/** Mechanic who created the quote; null once that mechanic is removed. */
export interface QuoteMechanicSummaryDto {
  id: number;
  fullName: string;
}

/** A single part or labor line with its snapshotted price and server-computed amounts. */
export interface QuoteLineDto {
  id: number;
  lineKind: QuoteLineKind;
  partId: number | null;
  laborTypeId: number | null;
  description: string;
  quantity: number;
  netUnitPrice: number;
  vatRatePercent: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  sortOrder: number;
}

/** List row returned by {@code GET /api/quotes} and {@code GET /api/vehicles/{id}/quotes}. */
export interface QuoteListItemDto {
  id: number;
  quoteNumber: string;
  title: string;
  status: QuoteStatus;
  isExpired: boolean;
  createdAt: string;
  validUntil: string;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  vehicleId: number;
  vehicle: QuoteVehicleSummaryDto;
  appointmentId: number | null;
  createdByMechanic: QuoteMechanicSummaryDto | null;
  version: number;
}

/** Full quote returned by {@code GET /api/quotes/{id}} and by every write endpoint. */
export interface QuoteDetailDto extends Omit<QuoteListItemDto, 'version'> {
  notes: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  lines: QuoteLineDto[];
  version: number;
}

/** Request payload for {@code POST /api/vehicles/{vehicleId}/quotes}. */
export interface CreateQuoteRequest {
  title: string;
  notes: string | null;
  validUntil: string | null;
  appointmentId: number | null;
}

/** Request payload for {@code PUT /api/quotes/{id}}; validity has its own endpoint (D23). */
export interface UpdateQuoteRequest {
  title: string;
  notes: string | null;
  version: number;
}

/** Unified line payload for line create and update (D40). */
export interface QuoteLineRequest {
  lineKind: QuoteLineKind;
  quantity: number;
  partId: number | null;
  laborTypeId: number | null;
  description: string | null;
  netUnitPrice: number | null;
  vatRatePercent: number | null;
  version: number;
}

/** Request payload for {@code POST /api/quotes/{id}/status}. */
export interface ChangeQuoteStatusRequest {
  status: QuoteStatus;
  version: number;
}

/** Request payload for {@code PUT /api/quotes/{id}/valid-until}. */
export interface ExtendQuoteValidityRequest {
  validUntil: string;
  version: number;
}
