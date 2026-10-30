/** Profile picture on Settings: the client refuses a wrong type, a size over 4 MB and an oversized image before
 * any upload, a valid one is cropped and sent as WebP, and removal is confirmed first. */
import { expect, test } from '@playwright/test';
import { openSettings } from './pages/settings.page';
import { APP_ICON_PNG, fakeImage, pngHeaderOnly, type UploadFile } from './support/picture-files';
import { errorToastMessage, toastMessage } from './support/toast';

const INVALID_TYPE_TOAST = 'Only PNG, JPG, JPEG, and WebP images are allowed.';
const FOUR_MB = 4 * 1024 * 1024;

interface RefusedPicture {
  readonly title: string;
  readonly file: UploadFile;
  readonly toast: string | RegExp;
}

const REFUSED_PICTURES: readonly RefusedPicture[] = [
  { title: 'a GIF', file: { name: 'animation.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') }, toast: INVALID_TYPE_TOAST },
  { title: 'a .png name with a text content type', file: { name: 'photo.png', mimeType: 'text/plain', buffer: Buffer.from('text') }, toast: INVALID_TYPE_TOAST },
  { title: 'a .png file whose bytes are not an image', file: fakeImage('fake.png'), toast: INVALID_TYPE_TOAST },
  { title: 'a file over 4 MB', file: { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(FOUR_MB + 1) }, toast: 'Selected image is too large. Maximum size is 4 MB.' },
  { title: 'a PNG wider than 8192 px', file: { name: 'wide.png', mimeType: 'image/png', buffer: pngHeaderOnly(9000, 10) }, toast: /Each side may be at most 8192 px/ },
  { title: 'a PNG over 20 megapixels', file: { name: 'large.png', mimeType: 'image/png', buffer: pngHeaderOnly(8000, 4000) }, toast: /at most 20 megapixels/ },
];

test.describe('Profile picture refusals', () => {
  for (const refused of REFUSED_PICTURES) {
    test(`refuses ${refused.title} before any upload`, async ({ page }) => {
      const routeCallLog: string[] = [];
      const { settings } = await openSettings(page, { routeCallLog });

      await settings.fileInput.setInputFiles(refused.file);

      await expect(errorToastMessage(page, refused.toast)).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(routeCallLog).not.toContain('PUT /api/profile/picture');
    });
  }

  test('offers only JPEG, PNG and WebP to the file picker', async ({ page }) => {
    const { settings } = await openSettings(page);

    await expect(settings.fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    await expect(settings.pictureSection).toContainText('JPEG, PNG or WebP. Max 4 MB.');
  });
});

test.describe('Profile picture upload and removal', () => {
  test('crops and uploads the picked picture as WebP, then shows it with a remove action', async ({ page }) => {
    const { settings } = await openSettings(page);
    await expect(settings.pictureSection.getByText('EM', { exact: true })).toBeVisible();
    await expect(settings.pictureSection.getByRole('button', { name: 'Remove' })).toHaveCount(0);

    const uploadRequest = page.waitForRequest((request) => request.method() === 'PUT' && new URL(request.url()).pathname === '/api/profile/picture');
    await settings.fileInput.setInputFiles(APP_ICON_PNG);

    const cropDialog = page.getByRole('dialog', { name: 'Crop profile picture' });
    const cropAndUpload = cropDialog.getByRole('button', { name: 'Crop & upload' });
    await expect(cropAndUpload).toBeEnabled();
    await cropAndUpload.click();

    const request = await uploadRequest;
    expect(request.headers()['content-type']).toContain('multipart/form-data');
    expect(request.postDataBuffer()?.toString('latin1')).toContain('name="file"; filename="icon.webp"');
    await expect(cropDialog).toBeHidden();
    await expect(toastMessage(page, 'Profile picture updated successfully.')).toBeVisible();

    const picture = settings.pictureSection.getByRole('img', { name: 'Profile picture' });
    await expect(picture).toBeVisible();
    await expect.poll(() => picture.evaluate((element) => (element instanceof HTMLImageElement ? element.naturalWidth : 0))).toBeGreaterThan(0);
    await expect(settings.pictureSection.getByRole('button', { name: 'Remove' })).toBeVisible();
  });

  test('cancelling the crop uploads nothing and the same file can be picked again', async ({ page }) => {
    const routeCallLog: string[] = [];
    const { settings } = await openSettings(page, { routeCallLog });
    const cropDialog = page.getByRole('dialog', { name: 'Crop profile picture' });

    await settings.fileInput.setInputFiles(APP_ICON_PNG);
    await expect(cropDialog).toBeVisible();
    await cropDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(cropDialog).toBeHidden();

    await settings.fileInput.setInputFiles(APP_ICON_PNG);
    await expect(cropDialog).toBeVisible();
    expect(routeCallLog).not.toContain('PUT /api/profile/picture');
  });

  test('a rejected upload keeps the crop dialog open and shows the failure', async ({ page }) => {
    const { settings } = await openSettings(page, {
      routeFailures: { 'PUT /api/profile/picture': { status: 422, body: { detail: 'The image could not be decoded.' } } },
    });
    const cropDialog = page.getByRole('dialog', { name: 'Crop profile picture' });

    await settings.fileInput.setInputFiles(APP_ICON_PNG);
    const cropAndUpload = cropDialog.getByRole('button', { name: 'Crop & upload' });
    await expect(cropAndUpload).toBeEnabled();
    await cropAndUpload.click();

    await expect(errorToastMessage(page, 'Failed to upload profile picture.')).toBeVisible();
    await expect(cropDialog).toBeVisible();
    await expect(settings.pictureSection.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  });

  test('removal asks for confirmation, then falls back to the initials', async ({ page }) => {
    const routeCallLog: string[] = [];
    const { settings, state } = await openSettings(page, { routeCallLog });
    state.profile.hasProfilePicture = true;
    await page.reload();
    const removeButton = settings.pictureSection.getByRole('button', { name: 'Remove' });
    const confirmDialog = settings.confirmDialog('Confirm picture removal');

    await removeButton.click();
    await confirmDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmDialog).toBeHidden();
    expect(routeCallLog).not.toContain('DELETE /api/profile/picture');
    await expect(removeButton).toBeVisible();

    await removeButton.click();
    await confirmDialog.getByRole('button', { name: 'Remove picture' }).click();

    await expect(toastMessage(page, 'Profile picture removed successfully.')).toBeVisible();
    await expect(removeButton).toHaveCount(0);
    await expect(settings.pictureSection.getByText('EM', { exact: true })).toBeVisible();
  });

  test('a failed removal keeps the picture and says so', async ({ page }) => {
    const { settings, state } = await openSettings(page, {
      routeFailures: { 'DELETE /api/profile/picture': { status: 400, body: { detail: 'Not possible.' } } },
    });
    state.profile.hasProfilePicture = true;
    await page.reload();

    await settings.pictureSection.getByRole('button', { name: 'Remove' }).click();
    await settings.confirmDialog('Confirm picture removal').getByRole('button', { name: 'Remove picture' }).click();

    await expect(errorToastMessage(page, 'Failed to remove profile picture.')).toBeVisible();
    await expect(settings.pictureSection.getByRole('button', { name: 'Remove' })).toBeVisible();
  });
});
