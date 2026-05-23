/** Shared field, placeholder, select, and input-group style primitives. */

/** Default full-width input used by standard forms (auth, settings, customer/admin forms). */
export const inputClass = 'min-h-11 w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-2.5 text-[15px] text-arsm-primary placeholder-arsm-placeholder outline-none transition duration-200 focus-visible:-translate-y-px motion-reduce:focus-visible:translate-y-0 focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 max-[320px]:px-3 max-[320px]:py-2 max-[320px]:text-sm dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/28';

/** Compact input variant used in denser rows and table-like edit surfaces. */
export const inputClassCompact = 'min-h-11 w-full rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 text-sm text-arsm-primary placeholder-arsm-placeholder outline-none transition duration-200 focus-visible:-translate-y-px motion-reduce:focus-visible:translate-y-0 focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/24';

/** Intake form controls used by scheduler intake and related modal forms. */
export const intakeInputClass = 'min-h-11 min-w-0 max-w-full w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-2.5 text-sm text-arsm-primary placeholder-arsm-placeholder outline-none transition duration-200 focus-visible:-translate-y-px motion-reduce:focus-visible:translate-y-0 focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/28';

export const intakeTextareaClass = `${intakeInputClass} resize-y`;

export const intakeDateTimeInputClass = `intake-datetime-input ${intakeInputClass}`;

/** Select primitives for filter rows and compact form dropdowns. */
export const compactSelectClass = 'h-11 min-h-11 rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 text-sm text-arsm-primary transition duration-200 focus-visible:-translate-y-px motion-reduce:focus-visible:translate-y-0 focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/24';

export const compactSelectFullClass = `${compactSelectClass} w-full min-w-0 max-w-full truncate`;

/** Width wrappers used to keep grouped controls responsive at 320px. */
export const selectWrapperClass = 'min-w-0 max-w-full overflow-hidden';

export const groupedControlWidthClass = 'min-w-0 basis-full max-[350px]:basis-full sm:basis-auto sm:min-w-[7.75rem] sm:max-w-[9.25rem]';

export const groupedControlWideWidthClass = 'min-w-0 basis-full max-[350px]:basis-full sm:basis-auto sm:min-w-[8.5rem] sm:max-w-[10rem]';

export const formFieldGroupClass = 'min-w-0 max-w-full';

export const formFieldGridClass = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2';

/** Input group primitives used by search fields and password visibility toggles. */
export const inputGroupContainerClass = 'relative min-w-0 max-w-full';

export const inputGroupIconClass = 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-arsm-muted dark:text-arsm-muted-dark';

export const searchInputClass = `${inputClass} pl-10 pr-12 text-sm`;

export const inputGroupOverlayButtonClass = 'absolute right-1 top-1/2 inline-flex h-11 w-11 shrink-0 -translate-y-1/2 items-center justify-center rounded-xl text-arsm-label transition-[color,transform] duration-150 ease-out hover:scale-105 hover:text-arsm-primary motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-60 dark:text-arsm-label-dark dark:hover:text-arsm-primary-dark';

export const passwordToggleButtonClass = inputGroupOverlayButtonClass;

export const searchClearButtonClass = inputGroupOverlayButtonClass;

/** Label/read-only helpers used by profile/settings/intake summary sections. */
export const intakeFieldWrapperClass = 'flex min-w-0 flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark';
export const intakeFieldLabelClass = 'font-medium';
export const readonlyInputClass = 'min-h-11 w-full cursor-not-allowed rounded-xl border border-arsm-border bg-arsm-input px-4 py-2.5 text-[15px] text-arsm-label outline-none max-[320px]:px-3 max-[320px]:py-2 max-[320px]:text-sm dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-placeholder-dark';
export const labelClass = 'mb-1.5 block text-sm font-medium text-arsm-label dark:text-arsm-label-dark';