import { defineConfig, devices } from '@playwright/test';

const isCi = (process.env.CI ?? '').length > 0;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://localhost:5173';
const forceReuseExistingServer = ['1', 'true'].includes(process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER ?? '');
const parsedWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? '', 10);
const localWorkers = Number.isFinite(parsedWorkers) && parsedWorkers > 0 ? parsedWorkers : 1;

/** See https://playwright.dev/docs/test-configuration. */
export default defineConfig({
  testDir: './tests/e2e',
  /* Runs after the web server is up: a cold dev server would time out the first spec on each worker. */
  globalSetup: './tests/e2e/support/warm-dev-server.ts',
  /* Keep browser-driven workflows deterministic while the suite is small. */
  fullyParallel: false,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCi,
  /* Retry on CI only */
  retries: isCi ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: isCi ? 1 : localWorkers,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['list'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL,
    ignoreHTTPSErrors: true,
    /* The app follows prefers-color-scheme until a theme is picked: pin light, which the specs assume. */
    colorScheme: 'light',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run the WebUI dev server before starting the tests. */
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !isCi || forceReuseExistingServer,
    timeout: 120_000,
  },
});
