/** Pure helpers that keep the cached quote list in step with full quotes returned by writes. */
import type { QuoteDetailDto, QuoteListItemDto } from '../../../types/quotes/quotes.types';

/** The list row of a full quote: the same fields without notes, lines and the sent/decided stamps. */
export function toQuoteListItem(detail: QuoteDetailDto): QuoteListItemDto {
  return {
    id: detail.id,
    quoteNumber: detail.quoteNumber,
    title: detail.title,
    status: detail.status,
    isExpired: detail.isExpired,
    createdAt: detail.createdAt,
    validUntil: detail.validUntil,
    totalNet: detail.totalNet,
    totalVat: detail.totalVat,
    totalGross: detail.totalGross,
    vehicleId: detail.vehicleId,
    vehicle: detail.vehicle,
    appointmentId: detail.appointmentId,
    createdByMechanic: detail.createdByMechanic,
    version: detail.version,
  };
}

/** Replaces the row of a saved quote, or puts a new quote first (the list is newest first); an uncached list stays unset. */
export function upsertQuoteRow(
  rows: QuoteListItemDto[] | undefined,
  detail: QuoteDetailDto,
): QuoteListItemDto[] | undefined {
  if (rows === undefined) {
    return undefined;
  }

  const row = toQuoteListItem(detail);

  return rows.some((candidate) => candidate.id === row.id)
    ? rows.map((candidate) => (candidate.id === row.id ? row : candidate))
    : [row, ...rows];
}

/** Drops the row of a deleted quote; an uncached list stays unset. */
export function removeQuoteRow(
  rows: QuoteListItemDto[] | undefined,
  quoteId: number,
): QuoteListItemDto[] | undefined {
  return rows?.filter((candidate) => candidate.id !== quoteId);
}
