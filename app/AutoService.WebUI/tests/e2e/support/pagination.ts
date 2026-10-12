import { expect, type Locator, type Page } from '@playwright/test';

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

/** Asserts the indicator reads "page / totalPages". */
export async function expectPageIndicator(controls: PaginationControls, page: number, totalPages: number): Promise<void> {
  await expect(controls.indicator).toHaveText(new RegExp(`^\\s*${String(page)}\\s*/\\s*${String(totalPages)}\\s*$`));
}

/** Clicks next and waits until the indicator shows the following page. */
export async function goToNextPage(controls: PaginationControls, currentPage: number, totalPages: number): Promise<void> {
  await controls.next.click();
  await expectPageIndicator(controls, currentPage + 1, totalPages);
}

/** Clicks previous and waits until the indicator shows the preceding page. */
export async function goToPreviousPage(controls: PaginationControls, currentPage: number, totalPages: number): Promise<void> {
  await controls.previous.click();
  await expectPageIndicator(controls, currentPage - 1, totalPages);
}
