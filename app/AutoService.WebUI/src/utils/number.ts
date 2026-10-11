/** `formatQuantity` formats a plain number (piece counts, hours) with locale-aware
 * grouping and up to 2 fraction digits; never rounds or derives a value. */

import { getNumberFormat } from './intlFormat';

const QUANTITY_OPTIONS: Intl.NumberFormatOptions = { maximumFractionDigits: 2 };

/** Formats a quantity (pieces or hours) with up to 2 fraction digits. */
export function formatQuantity(value: number, locale: string): string {
  return getNumberFormat(locale, QUANTITY_OPTIONS).format(value);
}
