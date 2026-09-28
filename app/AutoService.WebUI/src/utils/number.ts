/** `formatQuantity` formats a plain number (piece counts, hours) with locale-aware
 * grouping and up to 2 fraction digits; never rounds or derives a value. */

/** Formats a quantity (pieces or hours) with up to 2 fraction digits. */
export function formatQuantity(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}
