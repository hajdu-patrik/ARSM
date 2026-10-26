/** One-shot takeover of values stored under the pre-registry names, then deletion of those names.
 * Imported first in main.tsx so it runs before any reader module; safe to run repeatedly. */

import {
  AUTH_SESSION_HINT_KEY,
  LEGACY_AUTH_SESSION_HINT_KEY,
  LEGACY_ERROR_PAGE_IMAGES_CACHE_NAME,
  LEGACY_ERROR_PAGE_IMAGE_CACHED_AT_KEY_PREFIX,
  LEGACY_PREF_LANGUAGE_KEY,
  LEGACY_PREF_SIDEBAR_COLLAPSED_KEY,
  LEGACY_PREF_THEME_KEY,
  LEGACY_QUERY_CACHE_PRIVATE_KEY,
  LEGACY_SCHEDULER_SELECTED_VIEW_KEY,
  LEGACY_SPLASH_FIRST_SHOWN_KEY,
  LEGACY_SPLASH_SKIP_ON_NEXT_BOOT_KEY,
  PREF_LANGUAGE_KEY,
  PREF_SIDEBAR_COLLAPSED_KEY,
  PREF_THEME_KEY,
  QUERY_CACHE_PRIVATE_KEY,
  SCHEDULER_SELECTED_VIEW_KEY,
  SPLASH_FIRST_SHOWN_KEY,
  SPLASH_SKIP_ON_NEXT_BOOT_KEY,
} from './browserStorageKeys.ts';
import { listStorageKeys, readStorage, removeStorage, writeStorage, type StorageArea } from './safeStorage.ts';

const KEY_RENAMES: readonly (readonly [StorageArea, string, string])[] = [
  ['local', LEGACY_PREF_THEME_KEY, PREF_THEME_KEY],
  ['local', LEGACY_PREF_LANGUAGE_KEY, PREF_LANGUAGE_KEY],
  ['local', LEGACY_PREF_SIDEBAR_COLLAPSED_KEY, PREF_SIDEBAR_COLLAPSED_KEY],
  ['local', LEGACY_SPLASH_FIRST_SHOWN_KEY, SPLASH_FIRST_SHOWN_KEY],
  ['local', LEGACY_AUTH_SESSION_HINT_KEY, AUTH_SESSION_HINT_KEY],
  ['session', LEGACY_QUERY_CACHE_PRIVATE_KEY, QUERY_CACHE_PRIVATE_KEY],
  ['session', LEGACY_SCHEDULER_SELECTED_VIEW_KEY, SCHEDULER_SELECTED_VIEW_KEY],
  ['session', LEGACY_SPLASH_SKIP_ON_NEXT_BOOT_KEY, SPLASH_SKIP_ON_NEXT_BOOT_KEY],
];

/** Deletes the legacy Cache Storage; the images are re-downloadable and the API cannot rename. */
function deleteLegacyImageCache(): void {
  try {
    if (typeof globalThis.caches === 'undefined') {
      return;
    }
    globalThis.caches.delete(LEGACY_ERROR_PAGE_IMAGES_CACHE_NAME).catch(() => undefined);
  } catch {
    // Cache API blocked or unavailable: there is nothing to delete.
  }
}

/** Copies each legacy key to its new name when that is absent, then removes the legacy key. */
export function migrateLegacyBrowserStorage(): void {
  for (const [area, legacyKey, newKey] of KEY_RENAMES) {
    const legacyValue = readStorage(area, legacyKey);
    if (legacyValue === null) {
      continue;
    }
    if (readStorage(area, newKey) === null) {
      writeStorage(area, newKey, legacyValue);
    }
    removeStorage(area, legacyKey);
  }
  // The old private query cache once also lived in localStorage.
  removeStorage('local', LEGACY_QUERY_CACHE_PRIVATE_KEY);
  for (const key of listStorageKeys('local', LEGACY_ERROR_PAGE_IMAGE_CACHED_AT_KEY_PREFIX)) {
    removeStorage('local', key);
  }
  deleteLegacyImageCache();
}

migrateLegacyBrowserStorage();
