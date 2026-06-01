/** Shared browser-cache policy constants for private WebUI API data. */

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Storage key for persisted private TanStack Query data. */
export const PERSISTED_QUERY_CACHE_KEY = 'arsm-private-query-cache';

/** Cache buster for persisted private query data schema changes. */
export const PERSISTED_QUERY_CACHE_BUSTER = 'arsm-private-query-cache-v1';

/** Maximum age for private persisted read-model data in the current browser session. */
export const PERSISTED_QUERY_CACHE_MAX_AGE_MS = 30 * DAY_MS;

/** Stale time for the scheduler today query, which refreshes more aggressively than month windows. */
export const SCHEDULER_TODAY_STALE_TIME_MS = 30 * SECOND_MS;

/** Stale time for scheduler month-window queries. */
export const SCHEDULER_MONTH_STALE_TIME_MS = MINUTE_MS;

/** Interval for visible-tab scheduler background refreshes. */
export const SCHEDULER_BACKGROUND_REFRESH_INTERVAL_MS = MINUTE_MS;

/** Stale time for customer list and vehicle-summary reads. */
export const CUSTOMER_REGISTRY_STALE_TIME_MS = MINUTE_MS;

/** Stale time for customer and vehicle appointment-history reads. */
export const CUSTOMER_HISTORY_STALE_TIME_MS = MINUTE_MS;
