/** HUF currency formatters: two, split by field kind, formatting only server-computed values.
 * See app/AutoService.WebUI/CLAUDE.md. */

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
