/** Trusted Types: the production CSP enforces `require-trusted-types-for 'script'; trusted-types 'none'`.
 * The dev server sends no CSP, so each route is loaded with that policy added as a header. */
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { APP_ROUTE_CHECKS, LOGIN_ROUTE, prepareAppRoute } from './support/app-routes';
import {
  enforceTrustedTypes,
  readPolicyViolations,
  recordPolicyViolations,
  watchTrustedTypesErrors,
} from './support/trusted-types';

const APP_ICON_PNG = fileURLToPath(new URL('../../public/icon.png', import.meta.url));

test.describe('Trusted Types enforcement', () => {
  test('the policy is applied to the page and a refused sink is reported', async ({ page }) => {
    await enforceTrustedTypes(page);
    await recordPolicyViolations(page);
    await prepareAppRoute(page, LOGIN_ROUTE);

    const response = await page.goto(LOGIN_ROUTE.path);
    expect(response?.headers()['content-security-policy']).toContain("require-trusted-types-for 'script'");
    await expect(LOGIN_ROUTE.ready(page)).toBeVisible();

    // Control for the route checks below: a plain string reaching a DOM injection sink must be refused.
    const wasRefused = await page.evaluate(() => {
      try {
        document.createElement('div').innerHTML = '<b>text</b>';
        return false;
      } catch {
        return true;
      }
    });

    expect(wasRefused, 'Trusted Types are not enforced on the page').toBe(true);
    await expect
      .poll(async () => (await readPolicyViolations(page)).some((entry) => entry.includes('require-trusted-types-for')))
      .toBe(true);
  });

  test('the profile picture crop dialog opens without a Trusted Types violation', async ({ page }) => {
    const settingsRoute = APP_ROUTE_CHECKS.find((route) => route.path === '/settings');
    if (settingsRoute === undefined) {
      throw new Error('The settings route check is missing.');
    }

    const trustedTypesErrors = watchTrustedTypesErrors(page);
    await enforceTrustedTypes(page);
    await recordPolicyViolations(page);
    await prepareAppRoute(page, settingsRoute);
    await page.goto(settingsRoute.path);
    await expect(settingsRoute.ready(page)).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(APP_ICON_PNG);

    // The cropper once injected its stylesheet through innerHTML, which the policy refuses (the /500 page).
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).not.toHaveURL(/\/500/);
    expect(await readPolicyViolations(page)).toEqual([]);
    expect(trustedTypesErrors).toEqual([]);
  });

  for (const route of APP_ROUTE_CHECKS) {
    test(`${route.name} raises no Trusted Types violation`, async ({ page }) => {
      const trustedTypesErrors = watchTrustedTypesErrors(page);
      await enforceTrustedTypes(page);
      await recordPolicyViolations(page);
      await prepareAppRoute(page, route);

      await page.goto(route.path);
      await expect(route.ready(page)).toBeVisible();
      // Past the splash, so the code that runs once the app is ready has run too.
      await expect(page.locator('#root .arsm-loading-logo-halo')).toHaveCount(0);

      expect(await readPolicyViolations(page)).toEqual([]);
      expect(trustedTypesErrors).toEqual([]);
    });
  }
});
