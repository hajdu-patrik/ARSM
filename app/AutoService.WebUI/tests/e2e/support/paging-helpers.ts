/** Shared helpers of the catalog and quote paging specs: the booted page, the settled page size, the scroll overflow. */
import { expect, type Locator, type Page } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { installApiMocks } from './api-mocks';
import { getAppointmentFlowEnv } from './e2e-env';
import type { PaginationControls } from './pagination';
import type { MockApiState } from './test-data';

/** Waits until the rows and the indicator agree on one page size above 1, and returns that size. */
export async function settledPageSize(rows: Locator, controls: PaginationControls, total: number): Promise<number> {
  let pageSize = 0;
  await expect.poll(async () => {
    pageSize = await rows.count();
    const indicator = (await controls.indicator.count()) > 0 ? (await controls.indicator.innerText()).replaceAll(/\s+/g, ' ').trim() : '';
    return pageSize > 1 && indicator === `1 / ${String(Math.ceil(total / pageSize))}`;
  }).toBe(true);
  return pageSize;
}

/** Remaining vertical scroll of the page's scroll container; a fitted page leaves none. */
export function scrollOverflowPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    return main === null ? Number.NaN : main.scrollHeight - main.clientHeight;
  });
}

/** Mocks the API, lets the caller seed the state, and signs in as the mechanic at a fixed viewport. */
export async function bootPagedPage(
  page: Page,
  viewport: { readonly width: number; readonly height: number },
  seed?: (state: MockApiState) => void,
): Promise<void> {
  await page.setViewportSize(viewport);
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  seed?.(state);
  await new AuthPage(page).loginAsMechanic(env);
}
