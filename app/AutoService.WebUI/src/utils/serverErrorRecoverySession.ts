/** Session-scoped helpers for coordinating recovery from the /500 page: let the next
 * full app boot skip the branded loading splash once after a server-error retry. */

import { readStorage, removeStorage, writeStorage } from './safeStorage';
import { SPLASH_SKIP_ON_NEXT_BOOT_KEY } from './browserStorageKeys';

export function markSkipLoadingSplashOnNextBoot(): void {
  writeStorage('session', SPLASH_SKIP_ON_NEXT_BOOT_KEY, '1');
}

/** Consumes the one-shot splash-suppression marker; returns true when the next splash should be skipped. */
export function consumeSkipLoadingSplashOnNextBoot(): boolean {
  const shouldSkip = readStorage('session', SPLASH_SKIP_ON_NEXT_BOOT_KEY) === '1';

  if (shouldSkip) {
    removeStorage('session', SPLASH_SKIP_ON_NEXT_BOOT_KEY);
  }

  return shouldSkip;
}
