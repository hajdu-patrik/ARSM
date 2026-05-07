/**
 * Shared Tailwind CSS class strings for form elements.
 * @module utils/formStyles
 */

/** Standard full-width input field with light/dark focus states. */
export const inputClass = 'w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-3 text-[15px] text-arsm-primary placeholder-arsm-placeholder outline-none transition duration-200 focus-visible:-translate-y-px focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 max-[320px]:px-3 max-[320px]:py-2.5 max-[320px]:text-sm dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/28';

/** Compact input variant with smaller padding, used in detail modal edit fields. */
export const inputClassCompact = 'w-full rounded-lg border border-arsm-border bg-arsm-input px-2 py-1 text-sm text-arsm-primary outline-none transition focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:focus-visible:ring-arsm-focus-ring/24';

/** Read-only input field with muted background and cursor-not-allowed. */
export const readonlyInputClass = 'w-full cursor-not-allowed rounded-xl border border-arsm-border bg-arsm-surface px-4 py-3 text-[15px] text-arsm-label outline-none max-[320px]:px-3 max-[320px]:py-2.5 max-[320px]:text-sm dark:border-arsm-border-dark dark:bg-arsm-deepest dark:text-arsm-placeholder-dark';

/** Standard form label with muted color in both themes. */
export const labelClass = 'mb-1.5 block text-sm font-medium text-arsm-label dark:text-arsm-label-dark';

/** Rounded form surface container shared by settings, admin, and scheduler forms. */
export const cardClass = 'relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-card p-5 duration-200 max-[320px]:p-4 sm:p-6 dark:border-arsm-border-dark dark:bg-arsm-card-dark';

/** Primary action button with accent color and disabled states. */
export const buttonClass = 'inline-flex items-center justify-center rounded-xl bg-arsm-accent px-6 py-3 text-sm font-semibold text-arsm-primary transition duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:bg-arsm-accent-border max-[320px]:px-4 max-[320px]:py-2.5 max-[320px]:hover:translate-y-0 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:focus-visible:ring-arsm-focus-ring/32 dark:disabled:bg-arsm-ring-dark';
