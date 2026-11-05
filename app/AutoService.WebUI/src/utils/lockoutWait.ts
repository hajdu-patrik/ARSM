/** Resolves the lockout text of a 429 answer: the wait in whole minutes when the server named it. */

import { isAxiosError } from 'axios';

export type AttemptsExceededMessage =
  | { readonly key: 'common.validation.attemptsExceeded' }
  | { readonly key: 'common.validation.attemptsExceededWithDuration'; readonly minutes: number };

interface RetryAfterPayload {
  readonly retryAfterSeconds?: number;
}

/** Seconds until the next attempt, from the payload or the `Retry-After` header (seconds or date), else null. */
function parseRetryAfterSeconds(error: unknown): number | null {
  if (!isAxiosError<RetryAfterPayload | undefined>(error)) {
    return null;
  }

  const payloadRetryAfter = error.response?.data?.retryAfterSeconds;
  if (typeof payloadRetryAfter === 'number' && Number.isFinite(payloadRetryAfter) && payloadRetryAfter > 0) {
    return Math.floor(payloadRetryAfter);
  }

  // Axios types a header lookup as `any`; unknown makes the typeof checks below do the narrowing.
  const retryAfterHeader: unknown = error.response?.headers['retry-after'];

  if (typeof retryAfterHeader === 'string') {
    const parsedSeconds = Number.parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(parsedSeconds) && parsedSeconds > 0) {
      return parsedSeconds;
    }

    const parsedDate = Date.parse(retryAfterHeader);
    if (!Number.isNaN(parsedDate)) {
      const deltaSeconds = Math.ceil((parsedDate - Date.now()) / 1000);
      if (deltaSeconds > 0) {
        return deltaSeconds;
      }
    }
  }

  return null;
}

/** The lockout message of a failed request; callers interpolate `{ minutes, count: minutes }`. */
export function resolveAttemptsExceededMessage(error: unknown): AttemptsExceededMessage {
  const retryAfterSeconds = parseRetryAfterSeconds(error);
  if (retryAfterSeconds === null) {
    return { key: 'common.validation.attemptsExceeded' };
  }

  return {
    key: 'common.validation.attemptsExceededWithDuration',
    minutes: Math.max(1, Math.ceil(retryAfterSeconds / 60)),
  };
}
