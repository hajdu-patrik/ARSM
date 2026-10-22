/** Axe sweep of every app route on the mocked API: WCAG 2.0 level A and AA, no violation accepted. */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { APP_ROUTE_CHECKS, prepareAppRoute } from './support/app-routes';

const WCAG_TAGS = ['wcag2a', 'wcag2aa'];

for (const route of APP_ROUTE_CHECKS) {
  test(`${route.name} has no WCAG 2.0 A or AA violation`, async ({ page }) => {
    await prepareAppRoute(page, route);
    await page.goto(route.path);
    await expect(route.ready(page)).toBeVisible();
    // The splash covers the page for a moment, and the lists load behind it: scan the settled page.
    await expect(page.locator('#root .arsm-loading-logo-halo')).toHaveCount(0);
    await page.waitForLoadState('networkidle');

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
  });
}
