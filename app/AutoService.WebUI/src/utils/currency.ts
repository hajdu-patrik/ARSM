/**
 * HUF currency formatting helpers.
 *
 * Two formatters split by field kind (plan F2 / D19), because the display
 * rounding differs per field and a single parameterized formatter would turn
 * "which rounding applies here" into a decision made anew at every call
 * site. The function name states the rule instead.
 *
 * Both formatters only format numbers the server already computed
 * (`netUnitPrice`, `grossUnitPrice`, `hourlyNetRate`, `grossHourlyRate`,
 * line/total amounts) — neither one ever derives a value.
 * @module utils/currency
 */

/** Formats a whole-forint amount: line/total amounts and report totals. */
export function formatHuf(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formats a unit price or hourly rate with exactly 2 decimal places. */
export function formatHufUnitPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
