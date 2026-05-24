/**
 * Session-scoped helpers for coordinating recovery from the /500 page.
 *
 * Lets the next full app boot skip the branded loading splash once after
 * server-error retry navigation.
 * @module utils/serverErrorRecoverySession
 */

const SKIP_LOADING_SPLASH_ON_NEXT_BOOT_KEY = 'autoservice-skip-loading-splash-on-next-boot';

/** Checks whether `sessionStorage` is available in the current runtime. */
function hasSessionStorage(): boolean {
  return typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis;
}

/** Marks that the next app boot should suppress the loading splash once. */
export function markSkipLoadingSplashOnNextBoot(): void {
  if (!hasSessionStorage()) {
    return;
  }

  try {
    globalThis.sessionStorage.setItem(SKIP_LOADING_SPLASH_ON_NEXT_BOOT_KEY, '1');
  } catch {
    // Ignore storage failures and keep recovery flow functional.
  }
}

/**
 * Consumes the one-shot splash-suppression marker.
 * @returns `true` when the next splash should be skipped.
 */
export function consumeSkipLoadingSplashOnNextBoot(): boolean {
  if (!hasSessionStorage()) {
    return false;
  }

  try {
    const shouldSkip = globalThis.sessionStorage.getItem(SKIP_LOADING_SPLASH_ON_NEXT_BOOT_KEY) === '1';

    if (shouldSkip) {
      globalThis.sessionStorage.removeItem(SKIP_LOADING_SPLASH_ON_NEXT_BOOT_KEY);
    }

    return shouldSkip;
  } catch {
    return false;
  }
}