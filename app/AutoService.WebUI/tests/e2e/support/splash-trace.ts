import type { Locator, Page } from '@playwright/test';

/** What the page recorded about the live splash, the overlay React renders inside `#root`. */
export interface SplashTrace {
  readonly appearedAt: number | null;
  readonly disappearedAt: number | null;
  readonly coversViewport: boolean;
  readonly hasSolidBackground: boolean;
}

const TRACE_KEY = '__arsmSplashTrace';

/** Records the live splash from the first frame of every document, so a short splash cannot slip
 * between two polls. Read the result with `readSplashTrace`. */
export async function traceSplash(page: Page): Promise<void> {
  await page.addInitScript((traceKey: string) => {
    interface MutableTrace {
      appearedAt: number | null;
      disappearedAt: number | null;
      coversViewport: boolean;
      hasSolidBackground: boolean;
    }

    const trace: MutableTrace = { appearedAt: null, disappearedAt: null, coversViewport: false, hasSolidBackground: false };

    const observer = new MutationObserver(() => {
      // The static #login-shell copy lives outside #root, so only the React splash matches.
      const logo = document.querySelector('#root .arsm-loading-logo-halo');
      const now = performance.now();

      if (logo !== null && trace.appearedAt === null) {
        trace.appearedAt = now;

        const overlay = logo.closest('.fixed');
        if (overlay !== null) {
          const rect = overlay.getBoundingClientRect();
          const background = getComputedStyle(overlay).backgroundColor;
          trace.coversViewport = rect.width >= window.innerWidth - 1 && rect.height >= window.innerHeight - 1;
          trace.hasSolidBackground = background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)';
        }
      }

      if (logo === null && trace.appearedAt !== null && trace.disappearedAt === null) {
        trace.disappearedAt = now;
      }
    });

    observer.observe(document, { childList: true, subtree: true });
    Object.defineProperty(globalThis, traceKey, { value: trace });
  }, TRACE_KEY);
}

/** Narrows the value read back from the page to a complete trace. */
function isSplashTrace(value: unknown): value is SplashTrace {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const appearedAt: unknown = Reflect.get(value, 'appearedAt');
  const disappearedAt: unknown = Reflect.get(value, 'disappearedAt');
  const coversViewport: unknown = Reflect.get(value, 'coversViewport');
  const hasSolidBackground: unknown = Reflect.get(value, 'hasSolidBackground');

  return (appearedAt === null || typeof appearedAt === 'number')
    && (disappearedAt === null || typeof disappearedAt === 'number')
    && typeof coversViewport === 'boolean'
    && typeof hasSolidBackground === 'boolean';
}

/** Reads what `traceSplash` recorded for the current document. */
export async function readSplashTrace(page: Page): Promise<SplashTrace> {
  const value = await page.evaluate((traceKey: string): unknown => Reflect.get(globalThis, traceKey), TRACE_KEY);

  if (!isSplashTrace(value)) {
    throw new Error('No splash trace on the page: call traceSplash(page) before the page loads.');
  }

  return value;
}

/** How long the splash was up, in ms; throws when the trace saw it neither appear nor go away. */
export function splashDurationMs(trace: SplashTrace): number {
  if (trace.appearedAt === null || trace.disappearedAt === null) {
    throw new Error('The splash never appeared, or never went away.');
  }

  return trace.disappearedAt - trace.appearedAt;
}

/** True when nothing sits above the element at its own centre, so a click would reach it. */
export function isReachableByPointer(target: Locator): Promise<boolean> {
  return target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit !== null && element.contains(hit);
  });
}
