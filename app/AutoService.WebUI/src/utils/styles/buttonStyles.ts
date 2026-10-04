/** Shared button, action, option, and segmented-control style primitives. */

/** Shared hover/focus micro-motion for clickable controls (buttons/chips/icon actions). */
const buttonMicroInteractionClass = 'transition-[background-color,border-color,color,transform] duration-150 ease-out hover:-translate-y-px motion-reduce:hover:translate-y-0 motion-reduce:transition-colors [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-out hover:[&_svg]:translate-x-[1px] motion-reduce:hover:[&_svg]:translate-x-0';

/** Hover micro-motion dedicated to icon-only controls: a stronger scale that disabled controls skip; each variant adds its own tone-colored hover fill. */
export const iconButtonMicroInteractionClass = 'transition-[background-color,color,transform] duration-150 ease-out hover:scale-115 disabled:hover:scale-100 motion-reduce:hover:scale-100';

/** Focus-visible ring geometry; each variant adds its own ring color so the two never conflict. */
const focusRingGeometryClass = 'focus-visible:outline-none focus-visible:ring-2';

/** Accent focus ring used by neutral, primary, and toggle variants. */
const focusRingAccentClass = 'focus-visible:ring-arsm-focus-ring/40 dark:focus-visible:ring-arsm-focus-ring/30';

/** Error focus ring used by danger variants, matching iconDangerButtonClass. */
const focusRingDangerClass = 'focus-visible:ring-arsm-error-hover/40 dark:focus-visible:ring-arsm-error-dark/40';

/** Action tones shared by the medium (reference chip) and compact chip button families. */
const primaryActionToneClass = 'border-arsm-accent/60 bg-arsm-accent-subtle text-arsm-primary hover:border-arsm-accent hover:bg-arsm-accent-wash dark:border-arsm-accent-dark/60 dark:bg-arsm-accent-dark/25 dark:text-arsm-primary-dark dark:hover:border-arsm-accent-dark dark:hover:bg-arsm-accent-dark/35';
const dangerActionToneClass = 'border-arsm-error-border/75 bg-arsm-error-bg text-arsm-error-text hover:border-arsm-error-text/40 hover:bg-arsm-error-soft dark:border-arsm-error-dark/75 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:border-arsm-error-text-light/35 dark:hover:bg-arsm-error-bg-dark/85';

/** Generic utility and icon actions used in headers, toolbars, and modal close controls. */
export const compactUtilityButtonClass = `inline-flex h-11 min-h-11 min-w-[4.9rem] shrink-0 items-center justify-center rounded-2xl border border-arsm-accent/30 bg-arsm-accent-subtle/85 px-5 text-xs font-medium leading-normal text-arsm-primary hover:bg-arsm-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 max-[320px]:min-w-[3.9rem] max-[320px]:px-3.5 dark:border-arsm-accent-dark/30 dark:bg-arsm-hover-dark/80 dark:text-arsm-primary-dark dark:hover:bg-arsm-hover-dark dark:focus-visible:ring-arsm-focus-ring/30 ${buttonMicroInteractionClass}`;
export const sidebarShellIconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-2 text-arsm-label hover:bg-arsm-hover hover:text-arsm-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark dark:hover:text-arsm-primary-dark ${iconButtonMicroInteractionClass}`;
export const modalConfirmCloseButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-arsm-muted hover:bg-arsm-hover hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-arsm-muted dark:text-arsm-muted-dark dark:hover:bg-arsm-hover-dark dark:hover:text-arsm-primary-dark dark:disabled:hover:bg-transparent dark:disabled:hover:text-arsm-muted-dark ${iconButtonMicroInteractionClass}`;
export const iconDangerButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-error-border bg-arsm-error-bg text-arsm-error-text hover:bg-arsm-error-softest hover:text-arsm-error-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-error-hover/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:border-arsm-border disabled:bg-arsm-toggle-bg disabled:text-arsm-muted disabled:hover:bg-arsm-toggle-bg disabled:hover:text-arsm-muted dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/85 dark:hover:text-arsm-error-text-light dark:focus-visible:ring-arsm-error-dark/40 dark:disabled:border-arsm-border-dark dark:disabled:bg-arsm-toggle-bg-dark dark:disabled:text-arsm-muted-dark dark:disabled:hover:bg-arsm-toggle-bg-dark dark:disabled:hover:text-arsm-muted-dark ${iconButtonMicroInteractionClass}`;

/** Compact chip core (geometry, typography, focus, disabled) without the 44px touch sizing, which each chip base adds at its own breakpoint. */
const compactChipCoreClass = 'inline-flex min-h-7 min-w-0 max-w-full shrink-0 items-center justify-center gap-1 rounded-xl border px-2.5 py-0.5 text-xs font-semibold leading-normal tracking-normal whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-arsm-focus-ring/30';
/** Neutral chip tone; it matches the compact filter select surface (bg-card) it sits beside. */
const compactChipNeutralToneClass = 'border-arsm-border bg-arsm-card text-arsm-label hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark';

/** Compact chip button base shared by Customers and Scheduler local chip variants (min-h-7, scales to a 44px target below the sm breakpoint (640px)). */
export const compactChipActionBaseClass = `${compactChipCoreClass} max-sm:min-h-11 max-sm:px-3 max-sm:py-2`;
/** Compact chip variants; the neutral one matches the compact filter select surface (bg-card) it sits beside. */
export const compactChipNeutralButtonClass = `${compactChipActionBaseClass} ${compactChipNeutralToneClass}`;
export const compactChipPrimaryButtonClass = `${compactChipActionBaseClass} ${primaryActionToneClass}`;
export const compactChipDangerButtonClass = `${compactChipActionBaseClass} ${dangerActionToneClass}`;

/** Filter chips: the compact chips with the 44px touch target below lg (1024px) instead of sm, for controls beside the filter select. */
export const compactFilterChipActionBaseClass = `${compactChipCoreClass} max-lg:min-h-11 max-lg:px-3 max-lg:py-2`;
export const compactFilterChipNeutralButtonClass = `${compactFilterChipActionBaseClass} ${compactChipNeutralToneClass}`;

/** Row-level 44x44 icon actions (vehicle/quote/catalog rows, card expand toggles): scale + tone-background hover whose icon color never loses contrast (darkest tone text in light, lightest in dark); disabled renders neutral grey with no hover. */
const rowIconActionBaseClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:text-arsm-muted disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-arsm-muted dark:disabled:text-arsm-muted-dark dark:disabled:hover:bg-transparent dark:disabled:hover:text-arsm-muted-dark ${iconButtonMicroInteractionClass} ${focusRingGeometryClass} ${focusRingAccentClass}`;
export const rowIconActionInfoClass = `${rowIconActionBaseClass} text-arsm-info-text hover:bg-arsm-info-bg hover:text-arsm-info-text dark:text-arsm-info-text-dark dark:hover:bg-arsm-info-bg-dark dark:hover:text-arsm-info-text-dark`;
export const rowIconActionWarningClass = `${rowIconActionBaseClass} text-arsm-warning-text hover:bg-arsm-warning-bg hover:text-arsm-warning-text dark:text-arsm-warning-text-dark dark:hover:bg-arsm-warning-bg-dark dark:hover:text-arsm-warning-text-dark`;
export const rowIconActionDangerClass = `${rowIconActionBaseClass} text-arsm-error-active hover:bg-arsm-error-bg hover:text-arsm-error-text dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark dark:hover:text-arsm-error-text-light`;
export const rowIconActionAccentClass = `${rowIconActionBaseClass} text-arsm-accent-vivid hover:bg-arsm-accent-wash hover:text-arsm-accent-deep dark:text-arsm-accent dark:hover:bg-arsm-accent-dark/35 dark:hover:text-arsm-accent-dark-hover`;
export const rowIconActionNeutralClass = `${rowIconActionBaseClass} text-arsm-muted hover:bg-arsm-toggle-bg hover:text-arsm-primary dark:text-arsm-muted-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:text-arsm-primary-dark`;

/** Option tile primitives used by selectable cards and grouped checkbox-like controls. */
export const optionTileBaseClass = 'relative inline-flex h-11 min-h-11 w-auto max-w-full shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border px-3 py-2 text-xs transition has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-arsm-focus-ring/40 dark:has-[:focus-visible]:ring-arsm-focus-ring/30 disabled:cursor-not-allowed';
export const optionTileActiveClass = 'border-arsm-accent bg-arsm-toggle-bg text-arsm-primary ring-1 ring-arsm-accent/25 dark:border-arsm-accent-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-primary-dark dark:ring-arsm-accent-dark/30';
export const optionTileInactiveClass = 'border-arsm-border bg-arsm-input text-arsm-label hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark';
export const optionTileCheckboxClass = 'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-md border';
export const optionTileCheckboxActiveClass = 'border-arsm-accent bg-arsm-accent dark:border-arsm-accent-dark dark:bg-arsm-accent-dark';
export const optionTileCheckboxInactiveClass = 'border-arsm-border bg-transparent dark:border-arsm-border-dark';
export const hiddenCheckboxClass = 'pointer-events-none absolute opacity-0';

/** Segmented controls used where two-state mode switching is required (for example view mode toggles). */
export const segmentedControlClass = 'grid min-w-0 grid-cols-2 gap-1.5 rounded-xl bg-arsm-toggle-bg p-1.5 dark:bg-arsm-toggle-bg-dark';

const segmentedControlOptionBaseClass = 'inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-60';
const segmentedControlOptionActiveClass = 'border border-arsm-accent/80 bg-arsm-accent text-arsm-on-accent ring-1 ring-arsm-accent-deep/20 dark:border-arsm-accent-dark/85 dark:bg-arsm-accent-dark dark:text-arsm-on-accent-dark dark:ring-arsm-accent-dark/35';
const segmentedControlOptionInactiveClass = 'bg-transparent text-arsm-label hover:bg-arsm-accent-subtle dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark';

/** Resolves the segmented-control option classes for the active or inactive state. */
export const getSegmentedControlOptionClass = (isActive: boolean): string =>
  `${segmentedControlOptionBaseClass} ${isActive ? segmentedControlOptionActiveClass : segmentedControlOptionInactiveClass}`;

/** Canonical medium button family for contextual panel/card actions. */
const mediumContextActionShapeClass = `inline-flex min-w-0 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold leading-normal ring-1 ring-transparent disabled:cursor-not-allowed disabled:opacity-60 ${buttonMicroInteractionClass} ${focusRingGeometryClass}`;
const mediumContextActionBaseClass = `${mediumContextActionShapeClass} h-11 min-h-11 whitespace-nowrap`;
/** Same shape as the medium base, but the label may wrap and the button grows from the 44px minimum height. */
const mediumContextActionWrapBaseClass = `${mediumContextActionShapeClass} min-h-11 whitespace-normal`;

const mediumContextNeutralToneClass = `border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/45 hover:bg-arsm-accent-wash dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/45 dark:hover:bg-arsm-hover-dark/90 ${focusRingAccentClass}`;
export const mediumContextNeutralButtonClass = `${mediumContextActionBaseClass} ${mediumContextNeutralToneClass}`;
export const mediumContextNeutralWrapButtonClass = `${mediumContextActionWrapBaseClass} ${mediumContextNeutralToneClass}`;
export const mediumContextPrimaryButtonClass = `${mediumContextActionBaseClass} ${primaryActionToneClass} ${focusRingAccentClass}`;
export const mediumContextPrimaryWrapButtonClass = `${mediumContextActionWrapBaseClass} ${primaryActionToneClass} ${focusRingAccentClass}`;
export const mediumContextDangerButtonClass = `${mediumContextActionBaseClass} ${dangerActionToneClass} ${focusRingDangerClass}`;

/** Canonical main CTA family for save/delete/edit and modal confirmation actions. */
const mainCtaActionBaseClass = `inline-flex h-11 min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 max-[350px]:w-full ${buttonMicroInteractionClass} ${focusRingGeometryClass}`;

export const mainCtaNeutralButtonClass = `${mainCtaActionBaseClass} border border-arsm-border bg-arsm-toggle-bg font-medium text-arsm-label hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark ${focusRingAccentClass}`;
export const mainCtaPrimaryButtonClass = `${mainCtaActionBaseClass} bg-arsm-accent font-semibold text-arsm-on-accent hover:bg-arsm-accent-hover dark:bg-arsm-accent-dark dark:text-arsm-on-accent-dark dark:hover:bg-arsm-accent-dark-hover ${focusRingAccentClass}`;
export const mainCtaDangerButtonClass = `${mainCtaActionBaseClass} border border-arsm-error-border bg-arsm-error-bg font-semibold text-arsm-error-text hover:bg-arsm-error-soft dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80 ${focusRingDangerClass}`;

/** Reference chips: canonical action sizes for details panels, compact toolbars, and history actions. */
export const referenceChipNeutralButtonClass = mediumContextNeutralButtonClass;
/** Neutral reference chip whose label wraps (long localized labels at 320px). */
export const referenceChipNeutralWrapButtonClass = mediumContextNeutralWrapButtonClass;
export const referenceChipPrimaryWrapButtonClass = mediumContextPrimaryWrapButtonClass;
export const referenceChipPrimaryButtonClass = mediumContextPrimaryButtonClass;
export const referenceChipDangerButtonClass = mediumContextDangerButtonClass;

/** Binary pill toggle helper used by compact on/off filter controls. */
const togglePillBaseClass = `inline-flex h-11 min-h-11 min-w-11 max-w-full items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 max-[350px]:w-full ${buttonMicroInteractionClass} ${focusRingGeometryClass} ${focusRingAccentClass}`;
const togglePillActiveClass = 'border-arsm-accent/80 bg-arsm-accent text-arsm-on-accent ring-1 ring-arsm-accent-deep/20 dark:border-arsm-accent-dark/85 dark:bg-arsm-accent-dark dark:text-arsm-on-accent-dark dark:ring-arsm-accent-dark/35';
const togglePillInactiveClass = 'border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/50 hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/50 dark:hover:bg-arsm-hover-dark';

/** Resolves the binary toggle-pill classes for the on or off state. */
export const getTogglePillClass = (isActive: boolean): string =>
  `${togglePillBaseClass} ${isActive ? togglePillActiveClass : togglePillInactiveClass}`;

/** Legacy aliases kept so older components can migrate incrementally. */
export const buttonClass = mainCtaPrimaryButtonClass;
export const secondaryButtonClass = mainCtaNeutralButtonClass;
export const dangerButtonClass = mainCtaDangerButtonClass;