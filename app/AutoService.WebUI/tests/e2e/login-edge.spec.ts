import { expect, test, type Locator, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { errorToastMessage } from './support/toast';

const tokenStorageKeyPattern = /token|jwt|access|refresh/i;

/** Reads storage keys that would indicate forbidden client-side token persistence. */
function getTokenLikeStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate((patternSource) => {
    const pattern = new RegExp(patternSource, 'i');
    const keys = [
      ...Object.keys(localStorage),
      ...Object.keys(sessionStorage),
    ];

    return keys.filter((key) => pattern.test(key));
  }, tokenStorageKeyPattern.source);
}

/** The vertical centre of the element on the page. */
async function verticalCentre(target: Locator): Promise<number> {
  const box = await target.boundingBox();

  if (box === null) {
    throw new Error('The element has no layout box.');
  }

  return box.y + box.height / 2;
}

/** True when the element comes before the first element matching the selector in the document. */
function precedesInDom(element: Locator, laterSelector: string): Promise<boolean> {
  return element.evaluate((earlier, selector) => {
    const later = document.querySelector(selector);

    // Neither node contains the other here, so a following node reports exactly this one flag.
    return later !== null && earlier.compareDocumentPosition(later) === Node.DOCUMENT_POSITION_FOLLOWING;
  }, laterSelector);
}

test.describe('Login method edge cases', () => {
  test('shows wrong-method validation when an email is entered in phone mode', async ({ page }) => {
    await primeBrowserState(page);
    await page.goto('/login');

    const wrongMethodMessage = 'Please switch to Email mode or enter a valid phone number.';

    await page.getByRole('button', { name: 'Phone' }).click();
    await page.getByLabel(/Email|E-mail|Phone|Telefon/i).fill('mechanic@example.test');
    await page.getByLabel(/Password|Jelszo|Jelszó/i).fill('StrongPass1!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(errorToastMessage(page, wrongMethodMessage)).toBeVisible();

    // The message is also shown under the field and bound to it.
    const identifier = page.locator('#identifier');
    await expect(identifier).toHaveAttribute('aria-invalid', 'true');
    await expect(identifier).toHaveAttribute('aria-describedby', /\S/);
    await expect(identifier).toHaveAccessibleDescription(wrongMethodMessage);
  });

  test('logs in with a valid phone identifier without storing token-like keys', async ({ page }) => {
    const routeCallLog: string[] = [];

    await primeBrowserState(page);
    await installApiMocks(page, {
      profileEmail: 'phone.login@example.test',
      routeCallLog,
    });
    await page.goto('/login');

    await page.getByRole('button', { name: 'Phone' }).click();
    await page.getByLabel(/Email|E-mail|Phone|Telefon/i).fill('+36 30 123 4567');
    await page.getByLabel(/Password|Jelszo|Jelszó/i).fill('StrongPass1!');

    await Promise.all([
      page.waitForURL((url) => url.pathname !== '/login'),
      page.getByRole('button', { name: 'Log in' }).click(),
    ]);

    expect(routeCallLog).toContain('POST /api/auth/login');
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
    expect(await getTokenLikeStorageKeys(page)).toEqual([]);
  });

  test('keeps the submit enabled, validates on submit and focuses the first invalid field', async ({ page }) => {
    await primeBrowserState(page);
    await page.goto('/login');

    const submit = page.getByRole('button', { name: 'Log in' });
    const identifier = page.locator('#identifier');
    const password = page.locator('#password');

    // The email/phone mode switch sits above the fields it changes, in the DOM and on screen.
    const modeSwitch = page.getByRole('button', { name: 'Phone' });
    expect(await precedesInDom(modeSwitch, '#identifier')).toBe(true);
    expect(await verticalCentre(modeSwitch)).toBeLessThan(await verticalCentre(identifier));

    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(identifier).toBeFocused();
    await expect(identifier).toHaveAttribute('aria-invalid', 'true');
    await expect(identifier).toHaveAccessibleDescription('This field is required.');
    await expect(password).toHaveAttribute('aria-invalid', 'true');
    await expect(password).toHaveAccessibleDescription('This field is required.');
    await expect(submit).toBeEnabled();

    await identifier.fill('mechanic@example.test');
    await submit.click();

    await expect(password).toBeFocused();
    await expect(identifier).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('announces a login error as a wrapping alert that stays for ten seconds', async ({ page }) => {
    await primeBrowserState(page);
    await page.goto('/login');

    await page.locator('#identifier').fill('+36 30 123 4567');
    await page.locator('#password').fill('StrongPass1!');
    await page.getByRole('button', { name: 'Log in' }).click();

    const toast = errorToastMessage(page, 'Please switch to Phone mode or enter a valid email address.');
    await expect(toast).toBeVisible();
    // The message wraps instead of being cut to one line.
    await expect(toast).toHaveCSS('white-space', 'normal');
    await expect(toast).toHaveCSS('overflow-wrap', 'anywhere');

    // A plain toast leaves after 5 s; an error toast is still up after 6 s and leaves by ~10 s.
    await page.waitForTimeout(6000);
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 6000 });
  });
});
