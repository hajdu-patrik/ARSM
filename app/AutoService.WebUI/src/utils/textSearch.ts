/** Shared text-search normalization: accent/diacritic- and case-insensitive matching,
 * reused across list search features (Customers, Admin mechanic list). */

/** Removes accents and lowercases input to support accent-insensitive search. */
export function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
