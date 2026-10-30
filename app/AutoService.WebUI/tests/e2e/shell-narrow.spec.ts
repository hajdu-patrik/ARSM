/** 320px phone width: the sign-in, forced-change, error and Settings pages keep every control inside the
 * viewport, and the header toggles keep their 44x44 touch target. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openSettings } from './pages/settings.page';
import { installApiMocks, type InstallApiMockOptions } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

const PHONE_WIDTH_PX = 320;
const TOUCH_TARGET_PX = 44;
const EDGE_TOLERANCE_PX = 1;

test.use({ viewport: { width: PHONE_WIDTH_PX, height: 700 } });

/** Every shown control sits inside the viewport width (the aria-hidden autofill decoys are not controls). */
async function expectControlsInsideViewport(controls: Locator): Promise<void> {
  const boxes = await Promise.all((await controls.all()).map((control) => control.boundingBox()));
  expect(boxes.length).toBeGreaterThan(0);

  for (const box of boxes) {
    expect(box).not.toBeNull();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(-EDGE_TOLERANCE_PX);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(PHONE_WIDTH_PX + EDGE_TOLERANCE_PX);
  }
}

async function expectHeaderTogglesTouchSized(page: Page): Promise<void> {
  for (const testId of ['theme-language-toggle', 'theme-mode-toggle']) {
    const box = await page.getByTestId(testId).boundingBox();
    expect(box?.width ?? 0, `${testId} width`).toBeGreaterThanOrEqual(TOUCH_TARGET_PX - EDGE_TOLERANCE_PX);
    expect(box?.height ?? 0, `${testId} height`).toBeGreaterThanOrEqual(TOUCH_TARGET_PX - EDGE_TOLERANCE_PX);
  }
}

async function expectNoSideScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function open(page: Page, path: string, signedIn: boolean, options: Partial<InstallApiMockOptions> = {}): Promise<void> {
  await primeBrowserState(page, { sessionHint: signedIn });
  await installApiMocks(page, { profileEmail: 'shell.narrow@example.test', isAuthenticated: signedIn, ...options });
  await page.goto(path);
}

test.describe('Pages at 320px', () => {
  test('the login form fits and its header toggles are touch-sized', async ({ page }) => {
    await open(page, '/login', false);
    await expect(page.locator('#identifier')).toBeVisible();

    await expectControlsInsideViewport(page.locator('form input:visible, form button:visible'));
    await expectHeaderTogglesTouchSized(page);
    await expectNoSideScroll(page);
  });

  test('the required password change page fits', async ({ page }) => {
    await open(page, '/change-password', true, { mustChangePassword: true });
    await expect(page.locator('#change-password-current')).toBeVisible();

    await expectControlsInsideViewport(page.locator('form input:not([aria-hidden="true"]):visible, button:visible'));
    await expectNoSideScroll(page);
  });

  test('the not-found page keeps its button inside the viewport', async ({ page }) => {
    await open(page, '/no-such-page', false);

    const goToLogin = page.getByRole('button', { name: 'Go to login' });
    await expect(goToLogin).toBeVisible();
    await expectControlsInsideViewport(goToLogin);
    await expectNoSideScroll(page);
  });

  test('Settings for an admin keeps its fields and buttons inside the viewport', async ({ page }) => {
    const { settings } = await openSettings(page, { isAdmin: true });
    await expect(settings.companySection).toBeVisible();

    await expectControlsInsideViewport(page.locator('main input:not([aria-hidden="true"]):not([type="file"]):visible, main button:visible'));
    await expectNoSideScroll(page);
    const main = page.getByRole('main');
    expect(await main.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  });
});
