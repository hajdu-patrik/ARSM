import { expect, type Locator, type Page } from '@playwright/test';

/** Opens the dropdown behind a test id and picks the option with that value (`${testId}-option-${value}`). */
export async function selectDropdownOption(page: Page, testId: string, value: string): Promise<void> {
  await page.getByTestId(testId).click();
  await page.getByTestId(`${testId}-option-${value}`).click();
  await expect(page.getByTestId(`${testId}-listbox`)).toBeHidden();
}

/** Opens a dropdown found by any locator (for example its label) and picks the option by its visible label. */
export async function selectDropdownOptionByLabel(page: Page, trigger: Locator, label: string | RegExp): Promise<void> {
  await trigger.click();
  await page.getByRole('option', { name: label, exact: typeof label === 'string' }).click();
  await expect(page.getByRole('listbox')).toBeHidden();
}

/** Asserts the visible label of a dropdown trigger. */
export async function expectDropdownLabel(trigger: Locator, label: string | RegExp): Promise<void> {
  await expect(trigger).toHaveText(label);
}

/** Asserts the selected value by opening the list: the option with that value is `aria-selected`; Escape closes it. */
export async function expectDropdownValue(page: Page, testId: string, value: string): Promise<void> {
  await page.getByTestId(testId).click();
  await expect(page.getByTestId(`${testId}-option-${value}`)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId(`${testId}-listbox`)).toBeHidden();
}

/** The option values the open list of a dropdown offers, read from the `${testId}-option-` test ids. */
export async function readDropdownOptionValues(page: Page, testId: string): Promise<string[]> {
  await page.getByTestId(testId).click();
  const prefix = `${testId}-option-`;
  const testIds = await page.locator(`[data-testid^="${prefix}"]`).evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('data-testid') ?? ''),
  );
  await page.keyboard.press('Escape');
  await expect(page.getByTestId(`${testId}-listbox`)).toBeHidden();

  return testIds.map((id) => id.slice(prefix.length));
}
