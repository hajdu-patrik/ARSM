/**
 * Shared Tailwind CSS class strings for form elements.
 *
 * Centralizes styling for inputs, labels, cards, and buttons used across
 * the admin registration, settings, and scheduler pages.
 * Re-exported by page-level {@code constants.ts} files.
 * @module utils/formStyles
 */

/** Standard full-width input field with purple focus ring (light + dark). */
export const inputClass =
  'w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-3 text-[15px] text-arsm-primary placeholder-arsm-placeholder outline-none transition focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-accent/40 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-accent/24';

/** Compact input variant with smaller padding, used in detail modal edit fields. */
export const inputClassCompact =
  'w-full rounded-lg border border-arsm-border bg-arsm-input px-2 py-1 text-sm dark:border-arsm-border-dark dark:bg-arsm-input-dark';

/** Read-only input field with muted background and cursor-not-allowed. */
export const readonlyInputClass =
  'w-full rounded-xl border border-arsm-border bg-arsm-surface px-4 py-3 text-[15px] text-arsm-label outline-none cursor-not-allowed dark:border-arsm-border-dark dark:bg-arsm-deepest dark:text-arsm-placeholder-dark';

/** Standard form label with muted color (light + dark). */
export const labelClass = 'mb-1.5 block text-sm font-medium text-arsm-label dark:text-arsm-label-dark';

/** Rounded card container with border and subtle background. */
export const cardClass =
  'rounded-2xl border border-arsm-border bg-arsm-input p-5 sm:p-6 dark:border-arsm-border-dark dark:bg-arsm-card-dark';

/** Primary action button with purple accent, shadow, and hover/disabled states. */
export const buttonClass =
  'inline-flex items-center justify-center rounded-xl bg-arsm-accent px-6 py-3 text-sm font-semibold text-arsm-primary shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition hover:bg-arsm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-accent/40 disabled:cursor-not-allowed disabled:bg-arsm-accent-border dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:focus-visible:ring-arsm-accent-dark-hover/30 dark:disabled:bg-arsm-ring-dark';
