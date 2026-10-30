/** Small UI helpers shared by the scheduler specs. */
import type { Page } from '@playwright/test';
import { toastRegion } from './toast';

/** Dismisses every toast on screen, so a stack of earlier toasts never covers the control the spec clicks next. */
export async function dismissToasts(page: Page): Promise<void> {
  const dismissButtons = toastRegion(page).getByRole('button');

  while ((await dismissButtons.count()) > 0) {
    await dismissButtons.first().click();
  }
}
