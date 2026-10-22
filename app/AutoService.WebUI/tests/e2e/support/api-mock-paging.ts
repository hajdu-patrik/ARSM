import type { Route } from '@playwright/test';
import type { PagedResult } from '../../../src/types/common/pagination.types';
import { fulfillJson } from './api-mock-response';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 500;
const MAX_SEARCH_LENGTH = 100;

/** How a mocked list endpoint matches and orders its rows, like the real query does. */
export interface PagedMockOptions<T> {
  /** Texts the case-insensitive substring search looks at; omit when the endpoint has no search. */
  readonly searchFields?: (item: T) => readonly (string | null | undefined)[];
  /** Ascending order of the endpoint; omit when the source is already in the server's order. */
  readonly compare?: (left: T, right: T) => number;
}

function readPositiveInteger(raw: string | null, fallback: number): number {
  const value = Number.parseInt(raw ?? '', 10);

  return Number.isNaN(value) ? fallback : value;
}

/** Trims the search like the server: blank is no search, at most 100 characters, upper-cased. */
function normalizeSearch(raw: string | null): string | null {
  const term = (raw ?? '').trim().slice(0, MAX_SEARCH_LENGTH);

  return term.length === 0 ? null : term.toUpperCase();
}

/** Text compare for the ascending orders of the mocked lists (null-safe). */
export function compareText(left: string | null | undefined, right: string | null | undefined): number {
  return (left ?? '').localeCompare(right ?? '', 'en');
}

/** Slices and filters a seeded array by the page, pageSize and search query parameters of the URL. */
function buildPagedResult<T>(url: URL, source: readonly T[], options: PagedMockOptions<T> = {}): PagedResult<T> {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, readPositiveInteger(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE)));
  const page = Math.max(1, readPositiveInteger(url.searchParams.get('page'), 1));
  const term = options.searchFields ? normalizeSearch(url.searchParams.get('search')) : null;
  const { searchFields, compare } = options;

  let rows = [...source];
  if (term !== null && searchFields) {
    rows = rows.filter((item) => searchFields(item).some((field) => (field ?? '').toUpperCase().includes(term)));
  }

  if (compare) {
    rows.sort(compare);
  }

  const start = (page - 1) * pageSize;

  return { items: rows.slice(start, start + pageSize), totalCount: rows.length, page, pageSize };
}

/** Answers a list request with the PagedResult of the seeded source. */
export async function fulfillPaged<T>(route: Route, source: readonly T[], options: PagedMockOptions<T> = {}): Promise<void> {
  await fulfillJson(route, buildPagedResult(new URL(route.request().url()), source, options));
}
