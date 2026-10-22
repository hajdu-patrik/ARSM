import { expect, type Locator } from '@playwright/test';

/** Fills a password input that stays read-only until it takes focus (the autofill lock): click it first, then type. */
export async function fillLockedPasswordField(field: Locator, value: string): Promise<void> {
  await field.click();
  await expect(field).not.toHaveAttribute('readonly', '');
  await field.fill(value);
}
