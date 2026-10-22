/** Session-scoped helpers for coordinating recovery from the /500 page: let the next
 * full app boot skip the branded loading splash once after a server-error retry. */

import { readStorage, removeStorage, writeStorage } from './safeStorage';

/** Session storage key of the one-shot marker; index.html's pre-paint script reads the same key. */
const SKIP_LOADING_SPLASH_ON_NEXT_BOOT_KEY = 'autoservice-skip-loading-splash-on-next-boot';

export function markSkipLoadingSplashOnNextBoot(): void {
  writeStorage('session', SKIP_LOADING_SPLASH_ON_NEXT_BOOT_KEY, '1');
}

/** Consumes the one-shot splash-suppression marker; returns true when the next splash should be skipped. */
export function consumeSkipLoadingSplashOnNextBoot(): boolean {
  const shouldSkip = readStorage('session', SKIP_LOADING_SPLASH_ON_NEXT_BOOT_KEY) === '1';

  if (shouldSkip) {
    removeStorage('session', SKIP_LOADING_SPLASH_ON_NEXT_BOOT_KEY);
  }

  return shouldSkip;
}
