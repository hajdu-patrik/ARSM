/**
 * Shared text-search normalization utilities.
 *
 * Provides accent/diacritic-insensitive, case-insensitive text matching helpers
 * reused across list search features (Customers, Admin mechanic list).
 * @module utils/textSearch
 */

/**
 * Removes accents and lowercases input to support accent-insensitive search.
 * @param value Raw input value.
 * @returns Normalized value suitable for contains matching.
 */
export function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
