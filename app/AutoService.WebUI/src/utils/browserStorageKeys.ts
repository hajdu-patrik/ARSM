/** Registry of every browser storage name (scheme arsm.<area>.<purpose>); no module may
 * hold a storage name as a local literal. Documented in app/AutoService.WebUI/CLAUDE.md. */

// localStorage

/** Saved theme choice (light or dark); keeps the pick across visits. */
export const PREF_THEME_KEY = 'arsm.pref.theme';
/** Saved UI language (hu or en); restores the chosen language at start-up. */
export const PREF_LANGUAGE_KEY = 'arsm.pref.language';
/** Saved sidebar collapsed state; restores the sidebar layout. */
export const PREF_SIDEBAR_COLLAPSED_KEY = 'arsm.pref.sidebarCollapsed';
/** Flag set after the first full load; only that load shows the long splash. */
export const SPLASH_FIRST_SHOWN_KEY = 'arsm.splash.firstShown';
/** Hint that a session may exist; lets start-up skip the session probe when signed out. */
export const AUTH_SESSION_HINT_KEY = 'arsm.auth.sessionHint';
/** Key prefix, followed by the image path: when an error-page image was cached (cache expiry). */
export const ERROR_PAGE_IMAGE_CACHED_AT_KEY_PREFIX = 'arsm.errorPage.imageCachedAt:';

// sessionStorage

/** Persisted non-personal query cache (catalog options); survives reloads of one tab. */
export const QUERY_CACHE_PRIVATE_KEY = 'arsm.queryCache.private';
/** Selected scheduler view; restores the view after a reload within the tab. */
export const SCHEDULER_SELECTED_VIEW_KEY = 'arsm.scheduler.selectedView';
/** One-shot flag: the next boot skips the loading splash (for example a recovery reload). */
export const SPLASH_SKIP_ON_NEXT_BOOT_KEY = 'arsm.splash.skipOnNextBoot';

// Cache Storage

/** Cache of the error-page illustrations; keeps them available when the server is down. */
export const ERROR_PAGE_IMAGES_CACHE_NAME = 'arsm.errorPage.images.v1';

// Cookies

/** Non-HttpOnly CSRF cookie, read and echoed as the X-CSRF-Token header (double submit). */
export const AUTH_CSRF_COOKIE_NAME = '__Host-arsm-csrf-token';

// Legacy names: used only by legacyStorageMigration.ts (takeover and cleanup).

/** Legacy localStorage name of PREF_THEME_KEY. */
export const LEGACY_PREF_THEME_KEY = 'preferred-theme';
/** Legacy localStorage name of PREF_LANGUAGE_KEY. */
export const LEGACY_PREF_LANGUAGE_KEY = 'preferred-language';
/** Legacy localStorage name of PREF_SIDEBAR_COLLAPSED_KEY. */
export const LEGACY_PREF_SIDEBAR_COLLAPSED_KEY = 'preferred-sidebar-collapsed';
/** Legacy localStorage name of SPLASH_FIRST_SHOWN_KEY. */
export const LEGACY_SPLASH_FIRST_SHOWN_KEY = 'arsm-splash-shown';
/** Legacy localStorage name of AUTH_SESSION_HINT_KEY. */
export const LEGACY_AUTH_SESSION_HINT_KEY = 'autoservice-session-hint';
/** Legacy localStorage prefix of the image timestamps; deleted, not copied. */
export const LEGACY_ERROR_PAGE_IMAGE_CACHED_AT_KEY_PREFIX = 'arsm-error-illustration-ts:';
/** Legacy sessionStorage (and old localStorage copy) name of QUERY_CACHE_PRIVATE_KEY. */
export const LEGACY_QUERY_CACHE_PRIVATE_KEY = 'arsm-private-query-cache';
/** Legacy sessionStorage name of SCHEDULER_SELECTED_VIEW_KEY. */
export const LEGACY_SCHEDULER_SELECTED_VIEW_KEY = 'scheduler-selected-view';
/** Legacy sessionStorage name of SPLASH_SKIP_ON_NEXT_BOOT_KEY. */
export const LEGACY_SPLASH_SKIP_ON_NEXT_BOOT_KEY = 'autoservice-skip-loading-splash-on-next-boot';
/** Legacy Cache Storage name of ERROR_PAGE_IMAGES_CACHE_NAME; deleted, not copied. */
export const LEGACY_ERROR_PAGE_IMAGES_CACHE_NAME = 'arsm-error-illustrations-v1';
