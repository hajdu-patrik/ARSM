/** Error toast of a failing read: one per failure episode, re-armed only by the read's next success. */

import { useEffect, useRef } from 'react';

/** Identity of a read that passes no `readKey`, so such a read forms one fixed identity. */
const NO_READ_KEY = '';

/** Inputs of {@link useReadFailureToast}. */
export interface ReadFailureToastOptions {
  /** Message to toast while the read fails with nothing to show; null while it is not failing. */
  readonly failureMessageKey: string | null;
  /** TanStack `errorUpdatedAt` of the failure, the latest one when several reads are folded together. */
  readonly errorUpdatedAt: number;
  /** True once the read loaded successfully; it re-arms the toast. */
  readonly isSuccess: boolean;
  /** Identity of the read, for example the viewed month; a new identity starts a new episode. */
  readonly readKey?: string;
  /** Injected toast function; a function that returns a value is assignable. */
  readonly showErrorToast: (messageKey: string) => void;
}

/** Toasts a read failure once; a failure the cache kept from an earlier visit stays silent, and only
 * a success of the read re-arms the toast, so refocus, reconnect and background refetches never repeat it. */
export function useReadFailureToast({
  failureMessageKey,
  errorUpdatedAt,
  isSuccess,
  readKey = NO_READ_KEY,
  showErrorToast,
}: ReadFailureToastOptions): void {
  const mountedAtRef = useRef(0);
  const toastedReadKeyRef = useRef<string | null>(null);

  // Declared first, so the mount time is set before the toast effect compares against it.
  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isSuccess) {
      toastedReadKeyRef.current = null;
      return;
    }

    if (
      failureMessageKey === null ||
      errorUpdatedAt < mountedAtRef.current ||
      toastedReadKeyRef.current === readKey
    ) {
      return;
    }

    toastedReadKeyRef.current = readKey;
    showErrorToast(failureMessageKey);
  }, [errorUpdatedAt, failureMessageKey, isSuccess, readKey, showErrorToast]);
}

/** The fields of a TanStack query result that {@link useQueryReadFailureToast} reads. */
interface ReadQueryState {
  readonly data: unknown;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly errorUpdatedAt: number;
}

/** {@link useReadFailureToast} for one query that has nothing to show once it fails with no cached data. */
export function useQueryReadFailureToast(
  query: ReadQueryState,
  messageKey: string,
  showErrorToast: (messageKey: string) => void,
  readKey: string = NO_READ_KEY,
): void {
  useReadFailureToast({
    failureMessageKey: query.isError && query.data === undefined ? messageKey : null,
    errorUpdatedAt: query.errorUpdatedAt,
    isSuccess: query.isSuccess,
    readKey,
    showErrorToast,
  });
}
