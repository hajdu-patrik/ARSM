/** Period rules of the company results page, shared by the picker and its state hook. */

/** True when the month has not started yet in UTC, the same clock the year stepper uses; such a month has nothing to report. */
export function isFutureMonth(year: number, month: number, now: Date = new Date()): boolean {
  const currentYear = now.getUTCFullYear();

  return year > currentYear || (year === currentYear && month > now.getUTCMonth() + 1);
}
