/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const nodeEnv = ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env) ?? {};
const isCi = typeof nodeEnv.CI === 'string' && nodeEnv.CI.length > 0;
const baseURL = nodeEnv.PLAYWRIGHT_BASE_URL ?? 'https://localhost:5173';
const reuseExistingServerOverride = nodeEnv.PLAYWRIGHT_REUSE_EXISTING_SERVER;
const forceReuseExistingServer = reuseExistingServerOverride === '1' || reuseExistingServerOverride === 'true';

export default defineConfig({
  testDir: './tests/e2e',
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
  workers: isCi ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['list'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL,
    ignoreHTTPSErrors: true,

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

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
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
