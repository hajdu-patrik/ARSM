/** HUF currency formatters: two, split by field kind, formatting only server-computed values.
 * See app/AutoService.WebUI/CLAUDE.md. */

import { getNumberFormat } from './intlFormat';

const HUF_WHOLE_OPTIONS: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'HUF',
  maximumFractionDigits: 0,
};

const HUF_UNIT_PRICE_OPTIONS: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'HUF',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/** Formats a whole-forint amount: line/total amounts and report totals. */
export function formatHuf(amount: number, locale: string): string {
  return getNumberFormat(locale, HUF_WHOLE_OPTIONS).format(amount);
}

/** Formats a unit price or hourly rate with exactly 2 decimal places. */
export function formatHufUnitPrice(amount: number, locale: string): string {
  return getNumberFormat(locale, HUF_UNIT_PRICE_OPTIONS).format(amount);
}
