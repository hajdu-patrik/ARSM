import type { Locator, Page } from '@playwright/test';

/** The global toast live region; it stays mounted, and empty, while there is no toast. */
export function toastRegion(page: Page): Locator {
  return page.locator('output[aria-live="polite"]');
}

/** The message paragraph of the toast whose text matches, whatever its variant. */
export function toastMessage(page: Page, text: string | RegExp): Locator {
  return toastRegion(page).locator('p').filter({ hasText: text });
}

/** The message of an error toast: only those paragraphs carry `role="alert"`. */
export function errorToastMessage(page: Page, text: string | RegExp): Locator {
  return toastRegion(page).getByRole('alert').filter({ hasText: text });
}
