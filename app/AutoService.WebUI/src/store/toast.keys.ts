/**
 * Shared toast message keys and key classifiers.
 *
 * Centralizes toast-key reuse so mutation hooks and rendering logic stay in sync.
 * @module store/toast.keys
 */

/** Toast key used when an edit submit has no effective payload changes. */
export const TOAST_KEY_NO_CHANGES = 'toast.noChanges';

/** Keys that should receive the dedicated system-error visual treatment. */
export const SYSTEM_ERROR_TOAST_KEYS: ReadonlySet<string> = new Set([
  'login.serverError500',
  'login.databaseUnavailable',
]);

/** Keys that should be rendered with warning semantics. */
export const WARNING_TOAST_KEYS: ReadonlySet<string> = new Set([
  TOAST_KEY_NO_CHANGES,
]);
