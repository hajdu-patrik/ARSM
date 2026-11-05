/** An appointment live stream the server rejects (the browser closes it) is probed with the session check before
 * any refresh: a valid session reconnects with backoff and never refreshes, an expired one refreshes once. */
import { expect, test, type Page } from '@playwright/test';
import { fulfillJson } from './support/api-mock-response';
import { installApiMocks } from './support/api-mocks';
import { refuseApiRoute } from './support/appointment-route-overrides';
import { primeBrowserState } from './support/browser-state';
import { recordGetRequests } from './support/request-log';

const STREAM_PATH = '/api/appointments/updates';
const VALIDATE_PATH = '/api/auth/validate';
const REFRESH = 'POST /api/auth/refresh';

/** Stream connection attempts the reconnect backoff needs a few seconds to reach. */
const RECONNECT_ATTEMPTS = 3;

interface RejectedStreamScheduler {
  readonly routeCallLog: string[];
  readonly streamAttempts: URL[];
  readonly validateChecks: URL[];
}

/** Answers the first session check made after the stream was first requested with 401, as an expired session would. */
async function expireSessionAtFirstProbe(page: Page, streamAttempts: readonly URL[]): Promise<void> {
  let hasExpired = false;
  await page.route((url) => url.pathname === VALIDATE_PATH, async (route) => {
    if (streamAttempts.length === 0 || hasExpired) {
      await route.fallback();
      return;
    }

    hasExpired = true;
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
  });
}

/** Opens the scheduler while the server answers every live stream request with 503, as it does at the subscription cap. */
async function openWithRejectedStream(page: Page, isSessionExpired: boolean): Promise<RejectedStreamScheduler> {
  const routeCallLog: string[] = [];
  await primeBrowserState(page, { sessionHint: true });
  await installApiMocks(page, { profileEmail: 'live.reconnect@example.test', routeCallLog });
  const streamAttempts = recordGetRequests(page, STREAM_PATH);
  const validateChecks = recordGetRequests(page, VALIDATE_PATH);
  if (isSessionExpired) {
    await expireSessionAtFirstProbe(page, streamAttempts);
  }
  await refuseApiRoute(page, STREAM_PATH, 'GET', 503, {});

  await page.goto('/');
  await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();
  await expect.poll(() => streamAttempts.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(RECONNECT_ATTEMPTS);

  return { routeCallLog, streamAttempts, validateChecks };
}

test.describe('Rejected appointment stream', () => {
  test('a valid session reconnects again and again without a single refresh', async ({ page }) => {
    const { routeCallLog, validateChecks } = await openWithRejectedStream(page, false);

    // One check at start-up, then one probe per rejected attempt.
    expect(validateChecks.length).toBeGreaterThanOrEqual(RECONNECT_ATTEMPTS);
    expect(routeCallLog.filter((routeKey) => routeKey === REFRESH)).toHaveLength(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test('an expired session is refreshed once and the stream keeps reconnecting', async ({ page }) => {
    const { routeCallLog, streamAttempts } = await openWithRejectedStream(page, true);

    expect(streamAttempts.length).toBeGreaterThanOrEqual(RECONNECT_ATTEMPTS);
    expect(routeCallLog.filter((routeKey) => routeKey === REFRESH)).toHaveLength(1);
    await expect(page).toHaveURL(/\/$/);
  });
});
