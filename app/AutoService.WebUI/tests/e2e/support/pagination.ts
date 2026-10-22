import type { Locator, Page } from '@playwright/test';

/** Test-id prefixes of the shared Pagination control, one per paged list. */
export type PaginationPrefix =
  | 'customers-pagination'
  | 'customer-vehicles-pagination'
  | 'parts-pagination'
  | 'labor-types-pagination'
  | 'quotes-pagination'
  | 'mechanics-pagination'
  | 'intake-suggestions-pagination';

/** The previous and next buttons and the page indicator of one Pagination control. */
export interface PaginationControls {
  readonly previous: Locator;
  readonly next: Locator;
  readonly indicator: Locator;
}

/** Looks up the Pagination control by its test-id prefix. */
export function paginationControls(scope: Page | Locator, prefix: PaginationPrefix): PaginationControls {
  return {
    previous: scope.getByTestId(`${prefix}-prev`),
    next: scope.getByTestId(`${prefix}-next`),
    indicator: scope.getByTestId(`${prefix}-indicator`),
  };
}
