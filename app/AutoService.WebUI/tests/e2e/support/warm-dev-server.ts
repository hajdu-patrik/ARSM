import { chromium, type FullConfig } from '@playwright/test';
import { APP_ROUTE_CHECKS, prepareAppRoute } from './app-routes';

/** A cold Vite dev server (fresh node_modules) needs far longer than one expect timeout for its first loads. */
const WARM_UP_ROUTE_TIMEOUT_MS = 120_000;

/** Loads every app route once before the specs, so Vite pre-bundles all dependencies and lazy route chunks. */
export default async function warmDevServer(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (baseURL === undefined) {
    throw new Error('Playwright baseURL is not configured.');
  }
  const browser = await chromium.launch();
  try {
    for (const route of APP_ROUTE_CHECKS) {
      const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
      const page = await context.newPage();
      await prepareAppRoute(page, route);
      await page.goto(route.path, { timeout: WARM_UP_ROUTE_TIMEOUT_MS });
      await route.ready(page).waitFor({ timeout: WARM_UP_ROUTE_TIMEOUT_MS });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
