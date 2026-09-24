/**
 * Number formatting helpers.
 *
 * `formatQuantity` formats a plain number (piece counts, hours) for display
 * with locale-aware grouping and up to two fraction digits. It never rounds
 * or derives a value the caller did not already have.
 * @module utils/number
 */

/** Formats a quantity (pieces or hours) with up to 2 fraction digits. */
export function formatQuantity(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}
