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
  'w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-3 text-[15px] text-arsm-primary placeholder-arsm-placeholder shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition duration-200 focus-visible:-translate-y-px focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/28';

/** Compact input variant with smaller padding, used in detail modal edit fields. */
export const inputClassCompact =
  'w-full rounded-lg border border-arsm-border bg-arsm-input px-2 py-1 text-sm text-arsm-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:focus-visible:ring-arsm-focus-ring/24';

/** Read-only input field with muted background and cursor-not-allowed. */
export const readonlyInputClass =
  'w-full cursor-not-allowed rounded-xl border border-arsm-border bg-arsm-surface px-4 py-3 text-[15px] text-arsm-label shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] outline-none dark:border-arsm-border-dark dark:bg-arsm-deepest dark:text-arsm-placeholder-dark dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

/** Standard form label with muted color (light + dark). */
export const labelClass = 'mb-1.5 block text-sm font-medium text-arsm-label dark:text-arsm-label-dark';

/** Rounded card container with border and subtle background. */
export const cardClass =
  'relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-input p-5 shadow-[0_14px_30px_rgba(45,36,64,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset] sm:p-6 dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_18px_38px_rgba(5,8,20,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset]';

/** Primary action button with purple accent, shadow, and hover/disabled states. */
export const buttonClass =
  'inline-flex items-center justify-center rounded-xl bg-arsm-accent px-6 py-3 text-sm font-semibold text-arsm-primary shadow-[0_12px_26px_rgba(97,67,154,0.28)] transition duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_16px_34px_rgba(97,67,154,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:bg-arsm-accent-border disabled:shadow-none dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_14px_28px_rgba(10,12,24,0.55)] dark:hover:bg-arsm-accent-dark-hover dark:hover:shadow-[0_18px_36px_rgba(10,12,24,0.62)] dark:focus-visible:ring-arsm-focus-ring/32 dark:disabled:bg-arsm-ring-dark dark:disabled:shadow-none';
