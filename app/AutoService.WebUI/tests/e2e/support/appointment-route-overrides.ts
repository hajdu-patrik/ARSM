/** Per-spec route overrides for the appointment mocks: month reads, scripted refusals, body capture and the live stream. */
import { expect, type Page } from '@playwright/test';
import { withLifecycleFlags } from './api-mock-data';
import { corsHeaders, fulfillJson } from './api-mock-response';
import type { MockApiState } from './test-data';

const UPDATES_PATH = '/api/appointments/updates';

/** How long a spec waits for the client to (re)open the live stream, which backs off for one to two seconds. */
const STREAM_WAIT_MS = 15_000;

type PathMatcher = string | RegExp;

function matchesPath(matcher: PathMatcher, pathname: string): boolean {
  return typeof matcher === 'string' ? pathname === matcher : matcher.test(pathname);
}

/** Answers the month reads with the appointments of that local month only, like the API (the default mock returns all). */
export async function serveAppointmentsByMonth(page: Page, state: MockApiState): Promise<void> {
  await page.route((url) => url.pathname === '/api/appointments', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    const params = new URL(route.request().url()).searchParams;
    const year = Number(params.get('year'));
    const month = Number(params.get('month'));
    const inMonth = state.appointments.filter((appointment) => {
      const scheduledAt = new Date(appointment.scheduledDate);
      return scheduledAt.getFullYear() === year && scheduledAt.getMonth() + 1 === month;
    });

    await fulfillJson(route, inMonth.map((appointment) => withLifecycleFlags(state, appointment)));
  });
}

/** Switches a scripted refusal on and off, or changes what it answers. */
export interface Refusal {
  readonly lift: () => void;
  readonly restore: () => void;
  readonly respondWith: (status: number, body: unknown) => void;
}

/** Refuses one method of the matching API path with a status and body; other methods keep the default mock. */
export async function refuseApiRoute(
  page: Page,
  path: PathMatcher,
  method: string,
  status: number,
  body: unknown,
): Promise<Refusal> {
  let isActive = true;
  let answer = { status, body };

  await page.route((url) => matchesPath(path, url.pathname), async (route) => {
    if (!isActive || route.request().method() !== method) {
      await route.fallback();
      return;
    }

    await fulfillJson(route, answer.body, answer.status);
  });

  return {
    lift: () => {
      isActive = false;
    },
    restore: () => {
      isActive = true;
    },
    respondWith: (nextStatus, nextBody) => {
      answer = { status: nextStatus, body: nextBody };
    },
  };
}

/** Collects the JSON bodies of the requests with the method to the path, in the order they were sent. */
export function recordRequestBodies<T>(page: Page, method: string, path: PathMatcher): T[] {
  const bodies: T[] = [];
  page.on('request', (request) => {
    if (request.method() === method && matchesPath(path, new URL(request.url()).pathname)) {
      bodies.push(request.postDataJSON() as T);
    }
  });

  return bodies;
}

/** The SSE frame the API sends when an appointment changed. */
export function appointmentUpdatedFrame(appointmentId: number): string {
  return `event: appointment-updated\ndata: ${JSON.stringify({ appointmentId, occurredAt: Date.now() })}\n\n`;
}

/** Controls what the appointment live stream delivers and when. */
export interface LiveStreamControl {
  /** Connection attempts the client made so far. */
  readonly attempts: () => number;
  /** Delivers a frame on the open connection; the connection ends with it, so the client reconnects. */
  readonly emit: (frame: string) => Promise<void>;
}

/** Holds every stream connection open until the spec emits a frame, after failing the first `failFirst` attempts. */
export async function controlLiveStream(page: Page, failFirst = 0): Promise<LiveStreamControl> {
  const waiting: Array<(frame: string) => void> = [];
  let attempts = 0;

  await page.route((url) => url.pathname === UPDATES_PATH, async (route) => {
    attempts += 1;
    if (attempts <= failFirst) {
      await route.abort('failed');
      return;
    }

    const frame = await new Promise<string>((resolve) => {
      waiting.push(resolve);
    });
    await route.fulfill({ status: 200, contentType: 'text/event-stream', headers: corsHeaders(route), body: frame });
  });

  return {
    attempts: () => attempts,
    emit: async (frame) => {
      await expect.poll(() => waiting.length, { timeout: STREAM_WAIT_MS }).toBeGreaterThan(0);
      waiting.shift()?.(frame);
    },
  };
}
