import { defineConfig, devices } from '@playwright/test';

const isCi = (process.env.CI ?? '').length > 0;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://localhost:5173';
const forceReuseExistingServer = ['1', 'true'].includes(process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER ?? '');
const parsedWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? '', 10);
const localWorkers = Number.isFinite(parsedWorkers) && parsedWorkers > 0 ? parsedWorkers : 1;

export default defineConfig({
  testDir: './tests/e2e',
  /* Runs after the web server is up: a cold dev server would time out the first spec on each worker. */
  globalSetup: './tests/e2e/support/warm-dev-server.ts',
  /** Specs inside one file run in order; the workers run files in parallel. */
  fullyParallel: false,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : localWorkers,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    /* The app follows prefers-color-scheme until a theme is picked: pin light, which the specs assume. */
    colorScheme: 'light',

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: baseURL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !isCi || forceReuseExistingServer,
    timeout: 120_000,
  },
});
