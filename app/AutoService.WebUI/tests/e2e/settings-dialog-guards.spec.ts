/** Settings dialog guards: a focused password field is never re-locked under the cursor, and the crop dialog neither
 * closes while its upload is pending nor keeps the zoom of a previously picked file. */
import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openSettings } from './pages/settings.page';
import { APP_ICON_PNG, type UploadFile } from './support/picture-files';
import { toastMessage } from './support/toast';

/** Clicks the (initially read-only) field, types, clears it with the keyboard and types again. */
async function typeClearAndRetype(page: Page, field: Locator): Promise<void> {
  await field.click();
  await expect(field).not.toHaveAttribute('readonly', '');
  await page.keyboard.type('abc');
  await expect(field).toHaveValue('abc');

  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await expect(field).toHaveValue('');
  await expect(field).not.toHaveAttribute('readonly', '');

  await page.keyboard.type('xyz');
  await expect(field).toHaveValue('xyz');
}

test.describe('Password field lock', () => {
  test('a change-password field stays editable after the user clears it while it has focus', async ({ page }) => {
    await openSettings(page);

    await typeClearAndRetype(page, page.locator('#change-password-current'));
  });

  test('a delete-profile field stays editable after it is cleared, and the dialog locks it again only on close', async ({ page }) => {
    const { settings } = await openSettings(page);
    const dialog = await settings.openDeleteDialog();
    const field = page.locator('#delete-profile-password');

    await typeClearAndRetype(page, field);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await settings.openDeleteDialog();
    await expect(field).toHaveAttribute('readonly', '');
    await expect(field).toHaveValue('');
  });
});

const CROP_DIALOG = 'Crop profile picture';

test.describe('Crop dialog', () => {
  test('stays open while the upload is pending, and closes once it finished', async ({ page }) => {
    const { settings } = await openSettings(page);
    let releaseUpload!: () => void;
    const uploadGate = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    await page.route((url) => url.pathname === '/api/profile/picture', async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();
        return;
      }

      await uploadGate;
      await route.fallback();
    });
    const dialog = page.getByRole('dialog', { name: CROP_DIALOG });

    await settings.fileInput.setInputFiles(APP_ICON_PNG);
    const cropAndUpload = dialog.getByRole('button', { name: 'Crop & upload' });
    await expect(cropAndUpload).toBeEnabled();
    await cropAndUpload.click();
    await expect(dialog.getByRole('button', { name: /Uploading/ })).toBeDisabled();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    releaseUpload();
    await expect(dialog).toBeHidden();
    await expect(toastMessage(page, 'Profile picture updated successfully.')).toBeVisible();
  });

  test('a file picked after a cancelled one opens a fresh crop: the zoom starts over and the new file is uploaded', async ({ page }) => {
    const { settings } = await openSettings(page);
    const second: UploadFile = { name: 'second.png', mimeType: 'image/png', buffer: readFileSync(APP_ICON_PNG) };
    const dialog = page.getByRole('dialog', { name: CROP_DIALOG });
    const zoom = dialog.locator('#crop-zoom');

    await settings.fileInput.setInputFiles(APP_ICON_PNG);
    await expect(zoom).toHaveValue('1');
    await zoom.fill('2');
    await expect(zoom).toHaveValue('2');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    await settings.fileInput.setInputFiles(second);
    await expect(dialog).toBeVisible();
    await expect(zoom).toHaveValue('1');

    const cropAndUpload = dialog.getByRole('button', { name: 'Crop & upload' });
    await expect(cropAndUpload).toBeEnabled();
    const uploadRequest = page.waitForRequest((request) => request.method() === 'PUT' && new URL(request.url()).pathname === '/api/profile/picture');
    await cropAndUpload.click();

    expect((await uploadRequest).postDataBuffer()?.toString('latin1')).toContain('filename="second.webp"');
    await expect(toastMessage(page, 'Profile picture updated successfully.')).toBeVisible();
  });
});
