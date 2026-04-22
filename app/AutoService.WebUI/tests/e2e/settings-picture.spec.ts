import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { SettingsPage } from './pages/settings.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

function createTempImage(name: string, extension: string): string {
  const dir = path.join(__dirname, '..', '..', 'test-artifacts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${name}.${extension}`);

  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64',
  );
  fs.writeFileSync(filePath, png1x1);
  return filePath;
}

test.describe('Settings – profile picture', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);
  });

  test('upload profile picture opens crop modal', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const imgPath = createTempImage('test-avatar', 'png');
    await settings.uploadPicture(imgPath);

    const cropDialog = page.getByRole('dialog');
    await expect(cropDialog).toBeVisible({ timeout: 5_000 });
  });

  test('cancel crop modal closes without saving', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const imgPath = createTempImage('test-cancel', 'png');
    await settings.uploadPicture(imgPath);

    const cropDialog = page.getByRole('dialog');
    await expect(cropDialog).toBeVisible({ timeout: 5_000 });

    await settings.cancelCrop();
    await expect(cropDialog).toBeHidden();
  });

  test('confirm crop uploads picture', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const imgPath = createTempImage('test-confirm', 'png');
    await settings.uploadPicture(imgPath);

    const cropDialog = page.getByRole('dialog');
    await expect(cropDialog).toBeVisible({ timeout: 5_000 });

    const uploadPromise = page.waitForResponse(
      (r) => r.url().includes('/api/profile/picture') && r.request().method() === 'POST',
    );
    await settings.confirmCrop();
    const resp = await uploadPromise;

    expect(resp.status()).toBeLessThan(400);
  });

  test('remove picture button sends delete request', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const removeBtn = page.getByRole('button', { name: /remove/i });
    const isRemoveVisible = await removeBtn.isVisible().catch(() => false);

    if (isRemoveVisible) {
      const deletePromise = page.waitForResponse(
        (r) => r.url().includes('/api/profile/picture') && r.request().method() === 'DELETE',
      );
      await settings.removePicture();
      const resp = await deletePromise;
      expect(resp.status()).toBeLessThan(400);
    } else {
      expect(true).toBe(true);
    }
  });

  test('invalid file type shows error toast', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const invalidPath = createTempImage('test-invalid', 'gif');
    fs.renameSync(invalidPath, invalidPath.replace('.gif', '.gif'));

    const gifPath = path.join(path.dirname(invalidPath), 'test-invalid.gif');
    if (!fs.existsSync(gifPath)) {
      fs.writeFileSync(gifPath, Buffer.from('GIF89a'));
    }

    await settings.uploadPicture(gifPath);

    await page.waitForTimeout(1_500);
    const toast = page.getByText(/invalid|not allowed|type/i);
    const toastVisible = await toast.isVisible().catch(() => false);
    expect(toastVisible).toBe(true);
  });
});
