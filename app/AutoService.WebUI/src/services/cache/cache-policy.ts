/** Shared browser-cache policy constants for private WebUI API data. */

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Cache buster base for persisted query data; the person id is appended, so one user's payload never restores for another. */
export const PERSISTED_QUERY_CACHE_BUSTER = 'arsm.queryCache.private.v2';

/** Maximum age of persisted data and default garbage-collection time of every query (at most 24 h). */
export const PERSISTED_QUERY_CACHE_MAX_AGE_MS = DAY_MS;

/** Minimum gap between two writes of the persisted cache; the last state of a burst is still written. */
export const PERSISTED_QUERY_CACHE_WRITE_THROTTLE_MS = SECOND_MS;

/** Stale time for scheduler month-window queries. */
export const SCHEDULER_MONTH_STALE_TIME_MS = MINUTE_MS;

/** Interval for visible-tab scheduler background refreshes while the live update stream is down. */
export const SCHEDULER_BACKGROUND_REFRESH_INTERVAL_MS = MINUTE_MS;

/** Interval for those refreshes while the live stream is open: its events do the work, this is only the safety net. */
export const SCHEDULER_LIVE_REFRESH_INTERVAL_MS = 10 * MINUTE_MS;

/** Stale time for customer list and vehicle-summary reads. */
export const CUSTOMER_REGISTRY_STALE_TIME_MS = MINUTE_MS;

/** Stale time for customer and vehicle appointment-history reads. */
export const CUSTOMER_HISTORY_STALE_TIME_MS = MINUTE_MS;

/** Stale time for part and labor-type catalog reads. */
export const CATALOG_STALE_TIME_MS = MINUTE_MS;

export const QUOTES_STALE_TIME_MS = MINUTE_MS;

export const COMPANY_RESULTS_STALE_TIME_MS = MINUTE_MS;

export const PROFILE_STALE_TIME_MS = MINUTE_MS;

export const ADMIN_MECHANICS_STALE_TIME_MS = MINUTE_MS;

export const ADMIN_COMPANY_PROFILE_STALE_TIME_MS = MINUTE_MS;
