/** Shared field, placeholder, select, and input-group style primitives. */
import { focusVisibleOutlineClass } from './surfaceStyles';

/** Text-field surface shared by every input/textarea (border, fill, placeholder, focus, disabled); each field adds its own size and padding. */
const textFieldSurfaceClass = `rounded-xl border border-ui-field-border bg-ui-input text-ui-text placeholder-ui-placeholder transition duration-200 focus-visible:-translate-y-px motion-reduce:focus-visible:translate-y-0 focus-visible:border-ui-focus ${focusVisibleOutlineClass} disabled:cursor-not-allowed disabled:opacity-70`;

/** Full-width field body shared by the default and the search input; each variant adds its own horizontal padding and text size. */
const inputFieldBaseClass = `min-h-11 w-full py-2.5 max-[320px]:py-2 ${textFieldSurfaceClass}`;

/** Default full-width input used by standard forms (auth, settings, customer/admin forms). */
export const inputClass = `${inputFieldBaseClass} px-4 text-base sm:text-ui-field max-[320px]:px-3`;

/** Compact input variant used in denser rows and table-like edit surfaces. */
export const inputClassCompact = `min-h-11 w-full px-3 py-2 text-base sm:text-sm ${textFieldSurfaceClass}`;

/** Intake form controls: one shared field body; the input and the textarea each add their own minimum height. */
const intakeFieldBaseClass = `min-w-0 max-w-full w-full px-4 py-2.5 text-base sm:text-sm ${textFieldSurfaceClass}`;

export const intakeInputClass = `min-h-11 ${intakeFieldBaseClass}`;

/** The one multi-line text field (task descriptions, quote notes, appointment descriptions). */
export const textareaClass = `min-h-[6.5rem] resize-y ${intakeFieldBaseClass}`;

export const intakeDateTimeInputClass = `intake-datetime-input ${intakeInputClass}`;

/** Select primitives for filter rows and compact form dropdowns. */
const compactSelectClass = `h-11 min-h-11 rounded-xl border border-ui-field-border bg-ui-input px-3 py-2 text-base text-ui-text sm:text-sm transition duration-200 focus-visible:-translate-y-px motion-reduce:focus-visible:translate-y-0 focus-visible:border-ui-focus ${focusVisibleOutlineClass} disabled:cursor-not-allowed disabled:opacity-50`;

export const compactSelectFullClass = `${compactSelectClass} w-full min-w-0 max-w-full truncate`;

/** Compact filter select at its 28px size on every width; the touch variant below adds the 44px sizing. */
export const filterSelectCompactSlimSurfaceClass = `h-7 min-h-7 w-full min-w-0 max-w-full truncate rounded-xl border border-ui-field-border bg-arsm-card px-2 py-0.5 text-base font-semibold leading-tight tracking-normal sm:text-xs sm:leading-normal text-ui-label transition-colors hover:bg-ui-toggle focus-visible:border-ui-focus ${focusVisibleOutlineClass} dark:bg-arsm-input-dark`;

/** Compact select dedicated to filter toolbars (kept distinct from form/edit selects); reaches the 44px touch height below the lg breakpoint (1024px). */
export const filterSelectCompactSurfaceClass = `${filterSelectCompactSlimSurfaceClass} max-lg:h-11 max-lg:min-h-11 max-lg:py-2`;

/** Width wrapper for compact filter selects in responsive toolbar rows. */
export const filterSelectCompactWrapperClass = 'min-w-0 max-w-full basis-full sm:basis-auto sm:w-[9.125rem] sm:max-w-[9.125rem] sm:shrink-0';

/** Width wrappers used to keep grouped controls responsive at 320px. */
export const selectWrapperClass = 'min-w-0 max-w-full overflow-hidden';

export const formFieldGroupClass = 'min-w-0 max-w-full';

export const formFieldGridClass = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2';

/** Input group primitives used by search fields and password visibility toggles. */
export const inputGroupContainerClass = 'relative min-w-0 max-w-full';

/** z-10 keeps the icon above the input: the focus lift (translate) gives the input its own stacking layer that paints over a z-auto sibling. */
export const inputGroupIconClass = 'pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ui-muted';

/** Search field: pl-10 clears the search icon and pr-12 the clear button; the compact line-height keeps it 44px tall. */
export const searchInputClass = `${inputFieldBaseClass} pl-10 pr-12 text-base sm:text-ui-field leading-(--text-ui-small--line-height)`;

const inputGroupOverlayButtonClass = `absolute right-1 top-1/2 inline-flex h-11 w-11 shrink-0 -translate-y-1/2 items-center justify-center rounded-xl text-ui-label transition-[color,transform] duration-150 ease-out hover:scale-105 hover:text-ui-text motion-reduce:hover:scale-100 ${focusVisibleOutlineClass} disabled:cursor-not-allowed disabled:text-ui-muted disabled:opacity-60 disabled:hover:scale-100 disabled:hover:text-ui-muted`;

export const passwordToggleButtonClass = inputGroupOverlayButtonClass;

export const searchClearButtonClass = inputGroupOverlayButtonClass;

/** Label/read-only helpers used by profile/settings/intake summary sections. */
export const intakeFieldWrapperClass = 'flex min-w-0 flex-col gap-1 text-sm text-ui-text';
export const intakeFieldLabelClass = 'font-medium';
export const readonlyInputClass = `min-h-11 w-full cursor-not-allowed rounded-xl border border-ui-field-border bg-ui-input px-4 py-2.5 text-base text-arsm-label sm:text-ui-field focus-visible:border-ui-focus ${focusVisibleOutlineClass} max-[320px]:px-3 max-[320px]:py-2 dark:text-arsm-placeholder-dark`;
export const labelClass = 'mb-1.5 block text-sm font-medium text-ui-label';