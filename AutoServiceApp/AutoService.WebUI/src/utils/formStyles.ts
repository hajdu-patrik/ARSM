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
  'w-full rounded-xl border border-[#D8D2E9] bg-[#F6F4FB] px-4 py-3 text-[15px] text-[#2C2440] placeholder-[#8A829F] outline-none transition focus-visible:border-[#C9B3FF] focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#3A3154] dark:bg-[#1A1A25] dark:text-[#EDE8FA] dark:placeholder-[#8C83A8] dark:focus-visible:border-[#C9B3FF] dark:focus-visible:ring-[#C9B3FF3D]';

/** Compact input variant with smaller padding, used in detail modal edit fields. */
export const inputClassCompact =
  'w-full rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]';

/** Read-only input field with muted background and cursor-not-allowed. */
export const readonlyInputClass =
  'w-full rounded-xl border border-[#D8D2E9] bg-[#ECECEF] px-4 py-3 text-[15px] text-[#5E5672] outline-none cursor-not-allowed dark:border-[#3A3154] dark:bg-[#0E0E16] dark:text-[#8C83A8]';

/** Standard form label with muted color (light + dark). */
export const labelClass = 'mb-1.5 block text-sm font-medium text-[#5E5672] dark:text-[#CFC5EA]';

/** Rounded card container with border and subtle background. */
export const cardClass =
  'rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] p-5 sm:p-6 dark:border-[#3A3154] dark:bg-[#13131B]';

/** Primary action button with purple accent, shadow, and hover/disabled states. */
export const buttonClass =
  'inline-flex items-center justify-center rounded-xl bg-[#C9B3FF] px-6 py-3 text-sm font-semibold text-[#2C2440] shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition hover:bg-[#BFA6F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] disabled:cursor-not-allowed disabled:bg-[#DCCDFA] dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6] dark:focus-visible:ring-[#8A75D64D] dark:disabled:bg-[#4B406E]';
