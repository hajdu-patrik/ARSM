/** Read-state helpers of the scheduler query hooks: failure classification, folding and the loading flag. */

import type { FetchStatus } from '@tanstack/react-query';
import axios from 'axios';

/** How a read failed, without holding on to the error object. */
type ReadFailure = 'none' | 'auth-expired' | 'failed';

/** The part of a query result that the helpers below read. */
export interface ReadResult {
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly error: unknown;
  readonly errorUpdatedAt: number;
  readonly fetchStatus: FetchStatus;
}

/** Failure and success of one read, or of a group of reads that load together. */
export interface ReadStatus {
  readonly failure: ReadFailure;
  /** Time (epoch ms) of the latest failure among the failed reads, 0 while none failed. */
  readonly errorAt: number;
  readonly isSuccess: boolean;
}

/** True when an error represents an expired/forbidden auth session (Axios 401/403). */
function isAuthExpiredError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 401 || error.response?.status === 403;
}

function classifyFailure(result: ReadResult): ReadFailure {
  if (!result.isError) {
    return 'none';
  }

  return isAuthExpiredError(result.error) ? 'auth-expired' : 'failed';
}

/** Folds reads into one status: the worst failure (an expired session beats a plain failure) and whether all succeeded. */
export function foldReadStatus(results: readonly ReadResult[]): ReadStatus {
  const failures = results.map(classifyFailure);
  let failure: ReadFailure = 'none';

  if (failures.includes('auth-expired')) {
    failure = 'auth-expired';
  } else if (failures.includes('failed')) {
    failure = 'failed';
  }

  const errorTimes = results.filter((result) => result.isError).map((result) => result.errorUpdatedAt);

  return {
    failure,
    errorAt: Math.max(0, ...errorTimes),
    isSuccess: results.every((result) => result.isSuccess),
  };
}

/** True while a read has no data yet and is fetching or waiting to fetch; a parked (signed-out) read is idle. */
export function isInitialLoading(result: ReadResult): boolean {
  return result.isPending && result.fetchStatus !== 'idle';
}
