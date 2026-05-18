/**
 * Client-side cache helpers for 404/500 error-page illustrations.
 * @module utils/errorIllustrationCache
 */

const ERROR_ILLUSTRATION_CACHE_NAME = 'arsm-error-illustrations-v1';
const ERROR_ILLUSTRATION_PATHS = ['/Error-404.webp', '/Error-500.webp'] as const;
const ERROR_ILLUSTRATION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ERROR_ILLUSTRATION_CACHE_TS_PREFIX = 'arsm-error-illustration-ts:';

type CachedImageSource = {
  readonly src: string;
  readonly dispose?: () => void;
};

/** Returns whether Cache Storage is available in the current browser runtime. */
function canUseCacheStorage(): boolean {
  return globalThis.caches !== undefined && globalThis.location !== undefined;
}

/** Converts an app-relative image path to an absolute URL. */
function toAbsoluteUrl(path: string): string {
  return new URL(path, globalThis.location.origin).toString();
}

/** Builds the localStorage key used to track an image cache timestamp. */
function getTimestampKey(imagePath: string): string {
  return `${ERROR_ILLUSTRATION_CACHE_TS_PREFIX}${imagePath}`;
}

/** Reads the cache timestamp (ms) for a given image path. */
function readCacheTimestamp(imagePath: string): number | null {
  if (globalThis.localStorage === undefined) {
    return null;
  }

  try {
    const rawValue = globalThis.localStorage.getItem(getTimestampKey(imagePath));
    if (!rawValue) {
      return null;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

/** Stores the cache timestamp for a given image path. */
function writeCacheTimestamp(imagePath: string, timestampMs: number): void {
  if (globalThis.localStorage === undefined) {
    return;
  }

  try {
    globalThis.localStorage.setItem(getTimestampKey(imagePath), String(timestampMs));
  } catch {
    // Ignore storage failures (private mode/quota); cache can still function.
  }
}

/** Checks whether the cached image entry is older than the one-week TTL. */
function isCacheExpired(imagePath: string, nowMs: number = Date.now()): boolean {
  const cachedAt = readCacheTimestamp(imagePath);
  if (cachedAt === null) {
    return true;
  }

  return nowMs - cachedAt > ERROR_ILLUSTRATION_CACHE_TTL_MS;
}

/** Caches one image if not already present in the named cache. */
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

/** Preloads and caches the 404/500 illustrations without blocking app startup. */
export function warmErrorIllustrationCache(): void {
  if (!canUseCacheStorage()) {
    return;
  }

  void (async () => {
    const cache = await globalThis.caches.open(ERROR_ILLUSTRATION_CACHE_NAME);
    await Promise.allSettled(ERROR_ILLUSTRATION_PATHS.map((path) => cacheImageIfMissing(cache, path)));
  })();
}

/**
 * Resolves an error illustration from client cache as an object URL.
 * Falls back to the original source path when cache is unavailable.
 */
export async function getCachedErrorIllustrationSource(imagePath: string): Promise<CachedImageSource> {
  if (!canUseCacheStorage()) {
    return { src: imagePath };
  }

  const cache = await globalThis.caches.open(ERROR_ILLUSTRATION_CACHE_NAME);
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
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    return { src: imagePath };
  }
}
