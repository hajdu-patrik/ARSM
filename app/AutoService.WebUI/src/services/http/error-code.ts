/** Matching of the machine-readable `{ "code": "..." }` body the API answers some refusals with, so the
 * client reacts to the code and never to message text. */

import axios from 'axios';
import { isRecord } from './record-guard';

/** The `code` of an error response's JSON body, or undefined when the error has no such body. */
export function readErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined;
  }

  const body: unknown = error.response?.data;
  return isRecord(body) && typeof body.code === 'string' ? body.code : undefined;
}

/** True when the error is a response with the given HTTP status and the given code. */
export function hasErrorCode(error: unknown, status: number, code: string): boolean {
  return axios.isAxiosError(error) && error.response?.status === status && readErrorCode(error) === code;
}

/** True when a write was refused as stale (409 with the given code): the record changed after it was loaded. */
export function isVersionConflict(error: unknown, code: string): boolean {
  return hasErrorCode(error, 409, code);
}
