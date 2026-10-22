/** Client-side cache helpers for 404/500 error-page illustrations. */

import { logError } from './devLog';
import { readStorage, writeStorage } from './safeStorage';

const ERROR_ILLUSTRATION_CACHE_NAME = 'arsm-error-illustrations-v1';
const ERROR_ILLUSTRATION_PATHS = ['/Error-404.webp', '/Error-500.webp'] as const;
const ERROR_ILLUSTRATION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ERROR_ILLUSTRATION_CACHE_TS_PREFIX = 'arsm-error-illustration-ts:';
/** Latest start of the cache warm-up: it runs when the browser is idle, at the latest after this delay. */
const WARM_UP_DEADLINE_MS = 3000;

/** Resolved illustration source; `dispose` revokes the object URL when the source came from the cache. */
type CachedImageSource = {
  readonly src: string;
  readonly dispose?: () => void;
};

/** Returns whether Cache Storage is available in the current browser runtime (secure contexts only). */
function canUseCacheStorage(): boolean {
  return 'caches' in globalThis;
}

/** Opens the illustration cache, or returns null when Cache Storage refuses (for example in a private window). */
async function openIllustrationCache(): Promise<Cache | null> {
  try {
    return await globalThis.caches.open(ERROR_ILLUSTRATION_CACHE_NAME);
  } catch (error) {
    logError('errorIllustrationCache.open', error);
    return null;
  }
}

function toAbsoluteUrl(path: string): string {
  return new URL(path, globalThis.location.origin).toString();
}

function getTimestampKey(imagePath: string): string {
  return `${ERROR_ILLUSTRATION_CACHE_TS_PREFIX}${imagePath}`;
}

function readCacheTimestamp(imagePath: string): number | null {
  const rawValue = readStorage('local', getTimestampKey(imagePath));
  if (rawValue === null) {
    return null;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

/** Stores the cache timestamp for a given image path; a blocked storage only costs the TTL check. */
function writeCacheTimestamp(imagePath: string, timestampMs: number): void {
  writeStorage('local', getTimestampKey(imagePath), String(timestampMs));
}

/** Checks whether the cached image entry is older than the one-week TTL. */
function isCacheExpired(imagePath: string, nowMs: number = Date.now()): boolean {
  const cachedAt = readCacheTimestamp(imagePath);
  if (cachedAt === null) {
    return true;
  }

  return nowMs - cachedAt > ERROR_ILLUSTRATION_CACHE_TTL_MS;
}

async function cacheImageIfMissing(cache: Cache, imagePath: string): Promise<void> {
  const request = new Request(toAbsoluteUrl(imagePath), { credentials: 'same-origin' });
  const cachedResponse = await cache.match(request, { ignoreSearch: true });
  if (cachedResponse && !isCacheExpired(imagePath)) {
    return;
  }

  try {
    const response = await fetch(request, { credentials: 'same-origin', cache: 'force-cache' });
    if (response.ok) {
      await cache.put(request, response.clone());
      writeCacheTimestamp(imagePath, Date.now());
    }
  } catch {
    // Keep any existing cached asset as stale fallback when refresh fails.
  }
}

/** Stores the missing or expired illustrations in the cache; a refused Cache Storage only skips the warm-up. */
async function warmCache(): Promise<void> {
  const cache = await openIllustrationCache();
  if (cache === null) {
    return;
  }

  await Promise.allSettled(ERROR_ILLUSTRATION_PATHS.map((path) => cacheImageIfMissing(cache, path)));
}

/** Runs the task when the browser is idle, at the latest after the warm-up deadline;
 * Safari has no requestIdleCallback, so a timeout stands in. */
function runWhenIdle(task: () => void): void {
  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(task, { timeout: WARM_UP_DEADLINE_MS });
    return;
  }

  setTimeout(task, WARM_UP_DEADLINE_MS);
}

/** Preloads and caches the 404/500 illustrations once the browser is idle, so app start-up never waits for them. */
export function warmErrorIllustrationCache(): void {
  if (!canUseCacheStorage()) {
    return;
  }

  runWhenIdle(() => {
    void warmCache();
  });
}

/** Deletes the illustration cache at sign-out; never throws, so a blocked Cache Storage cannot break logout. */
export async function clearErrorIllustrationCache(): Promise<void> {
  if (!canUseCacheStorage()) {
    return;
  }

  try {
    await globalThis.caches.delete(ERROR_ILLUSTRATION_CACHE_NAME);
  } catch (error) {
    logError('errorIllustrationCache.clear', error);
  }
}

/** Resolves an error illustration from client cache as an object URL, falling back to the source path. */
export async function getCachedErrorIllustrationSource(imagePath: string): Promise<CachedImageSource> {
  if (!canUseCacheStorage()) {
    return { src: imagePath };
  }

  const cache = await openIllustrationCache();
  if (cache === null) {
    return { src: imagePath };
  }

  const request = new Request(toAbsoluteUrl(imagePath), { credentials: 'same-origin' });

  let response = await cache.match(request, { ignoreSearch: true });

  if (!response || isCacheExpired(imagePath)) {
    try {
      const fetchedResponse = await fetch(request, { credentials: 'same-origin', cache: 'force-cache' });
      if (fetchedResponse.ok) {
        await cache.put(request, fetchedResponse.clone());
        writeCacheTimestamp(imagePath, Date.now());
        response = fetchedResponse;
      }
    } catch {
      if (!response) {
        return { src: imagePath };
      }
    }
  }

  if (!response) {
    return { src: imagePath };
  }

  try {
    const imageBlob = await response.blob();
    const objectUrl = URL.createObjectURL(imageBlob);
    return {
      src: objectUrl,
      dispose: () => {
        URL.revokeObjectURL(objectUrl);
      },
    };
  } catch {
    return { src: imagePath };
  }
}
