/** Quote contracts used by the Quotes page (see `Quotes/QuoteEndpoints.Contracts.cs`). */

import type { PagedQuery } from '../common/pagination.types';

/** Stored quote status; `Expired` is never one of them (it is the computed `isExpired` flag). */
export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected';

/** Quote line kind, matching the backend `QuoteLineKind` enum. */
export type QuoteLineKind = 'Part' | 'Labor';

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

/** Why the linked appointment locks a quote, matching the API `lockReason` values. */
export type QuoteLockReason =
  | 'appointment_completed'
  | 'appointment_cancelled'
  | 'appointment_has_accepted_quote';

interface QuoteVehicleSummaryDto {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
}

/** Mechanic who created the quote; null once that mechanic is removed. */
interface QuoteMechanicSummaryDto {
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

/** List row returned by `GET /api/quotes` and `GET /api/vehicles/{id}/quotes`. */
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
  /** True exactly when `lockReason` is set: the linked appointment forbids every write. */
  isLocked: boolean;
  /** Set by the linked appointment; null for an unlocked or unlinked quote. */
  lockReason: QuoteLockReason | null;
  /** Server verdict on deleting this quote, whatever its status. */
  canDelete: boolean;
}

/** Query of `GET /api/quotes`: the paging and search parameters plus the optional stored-status and vehicle filters. */
export interface QuoteListQuery extends PagedQuery {
  status?: QuoteStatus;
  expired?: boolean;
  vehicleId?: number;
  appointmentId?: number;
}

/** Full quote returned by `GET /api/quotes/{id}` and by every write endpoint. */
export interface QuoteDetailDto extends Omit<QuoteListItemDto, 'version'> {
  notes: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  lines: QuoteLineDto[];
  version: number;
}

/** Request payload for `POST /api/vehicles/{vehicleId}/quotes`. */
export interface CreateQuoteRequest {
  title: string;
  notes: string | null;
  validUntil: string | null;
  appointmentId: number | null;
}

/** Request payload for `PUT /api/quotes/{id}`; validity has its own endpoint (D23). */
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

/** Request payload for `POST /api/quotes/{id}/status`. */
export interface ChangeQuoteStatusRequest {
  status: QuoteStatus;
  version: number;
}

/** Request payload for `PUT /api/quotes/{id}/valid-until`. */
export interface ExtendQuoteValidityRequest {
  validUntil: string;
  version: number;
}
