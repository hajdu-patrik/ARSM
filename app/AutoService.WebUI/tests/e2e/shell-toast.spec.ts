/** Toast behaviour of the shell: a persistent live region, stacking, the dismiss button, the 5 s lifetime that
 * pauses while the pointer rests on a toast, and the queue being emptied at logout. */
import { expect, test, type Page } from '@playwright/test';
import { openSettings } from './pages/settings.page';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { fakeImage } from './support/picture-files';
import { errorToastMessage, toastMessage, toastRegion } from './support/toast';

const INVALID_FORMAT = 'Invalid format. Try again.';

async function submitBrokenEmail(page: Page): Promise<void> {
  await page.locator('#identifier').fill('not-an-email');
  await page.locator('#password').fill('StrongPass1!');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

test.describe('Toast viewport', () => {
  test.beforeEach(async ({ page }) => {
    await primeBrowserState(page);
    await installApiMocks(page, { profileEmail: 'shell.toast@example.test', isAuthenticated: false });
    await page.goto('/login');
    await expect(page.locator('#identifier')).toBeVisible();
  });

  test('the polite live region is mounted and empty before any toast', async ({ page }) => {
    await expect(toastRegion(page)).toBeAttached();
    await expect(toastRegion(page)).toHaveText('');
    await expect(toastRegion(page).getByRole('alert')).toHaveCount(0);
  });

  test('toasts stack, and the dismiss button removes one of them', async ({ page }) => {
    await submitBrokenEmail(page);
    await expect(errorToastMessage(page, INVALID_FORMAT)).toHaveCount(1);
    await submitBrokenEmail(page);
    await expect(errorToastMessage(page, INVALID_FORMAT)).toHaveCount(2);

    await toastRegion(page).getByRole('button', { name: 'Dismiss notification' }).first().click();

    await expect(errorToastMessage(page, INVALID_FORMAT)).toHaveCount(1);
  });
});

test.describe('Toast lifetime', () => {
  test('a success toast waits while the pointer rests on it, then leaves within its remaining time', async ({ page }) => {
    const { settings } = await openSettings(page);
    await settings.firstName.fill('Hovered');
    await settings.saveProfileButton().click();
    await settings.confirmDialog('Confirm changes').getByRole('button', { name: 'Save', exact: true }).click();
    const toast = toastMessage(page, 'Profile updated successfully.');
    await expect(toast).toBeVisible();

    await toast.hover();
    // A plain toast lasts 5 s; held under the pointer it is still there well after that.
    await page.waitForTimeout(6500);
    await expect(toast).toBeVisible();

    await page.mouse.move(5, 400);
    await expect(toast).toBeHidden({ timeout: 7000 });
  });
});

test.describe('Toasts and logout', () => {
  test('logging out empties the toast queue', async ({ page }) => {
    const { settings } = await openSettings(page);
    await settings.fileInput.setInputFiles(fakeImage('fake.png'));
    await expect(errorToastMessage(page, 'Only PNG, JPG, JPEG, and WebP images are allowed.')).toBeVisible();

    await page.locator('aside:visible').getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(toastRegion(page).getByRole('alert')).toHaveCount(0);
  });
});
