/** Shared button, action, option, and segmented-control style primitives. */
import { focusVisibleOutlineClass } from './surfaceStyles';

/** Shared hover/focus micro-motion for clickable controls (buttons/chips/icon actions). */
const buttonMicroInteractionClass = 'transition-[background-color,border-color,color,transform] duration-150 ease-out hover:-translate-y-px motion-reduce:hover:translate-y-0 motion-reduce:transition-colors [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-out hover:[&_svg]:translate-x-[1px] motion-reduce:hover:[&_svg]:translate-x-0';

/** Hover micro-motion dedicated to icon-only controls: a stronger scale that disabled controls skip; each variant adds its own tone-colored hover fill. */
export const iconButtonMicroInteractionClass = 'transition-[background-color,color,transform] duration-150 ease-out hover:scale-115 disabled:hover:scale-100 motion-reduce:hover:scale-100';

/** Action tones shared by the medium (reference chip) and compact chip button families. */
const primaryActionToneClass = 'border-ui-accent/60 bg-arsm-accent-subtle text-ui-text hover:border-ui-accent hover:bg-arsm-accent-wash dark:bg-arsm-accent-dark/25 dark:hover:bg-arsm-accent-dark/35';
const dangerActionToneClass = 'border-arsm-error-border/75 bg-ui-error-bg text-arsm-error-text hover:border-arsm-error-text/40 hover:bg-arsm-error-soft dark:border-arsm-error-dark/75 dark:text-arsm-error-text-light dark:hover:border-arsm-error-text-light/35 dark:hover:bg-arsm-error-bg-dark/85';

/** Generic utility and icon actions used in headers, toolbars, and modal close controls. */
export const compactUtilityButtonClass = `inline-flex h-11 min-h-11 min-w-[4.9rem] shrink-0 items-center justify-center rounded-2xl border border-ui-accent/30 bg-arsm-accent-subtle/85 px-5 text-xs font-medium leading-normal text-ui-text hover:bg-arsm-accent-subtle ${focusVisibleOutlineClass} max-[320px]:min-w-[3.9rem] max-[320px]:px-3.5 dark:bg-arsm-hover-dark/80 dark:hover:bg-arsm-hover-dark ${buttonMicroInteractionClass}`;
export const sidebarShellIconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-2 text-ui-label hover:bg-ui-hover hover:text-arsm-accent-deep ${focusVisibleOutlineClass} dark:hover:text-arsm-primary-dark ${iconButtonMicroInteractionClass}`;
export const modalConfirmCloseButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-ui-muted hover:bg-ui-hover hover:text-ui-text ${focusVisibleOutlineClass} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ui-muted ${iconButtonMicroInteractionClass}`;
export const iconDangerButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-error-border bg-ui-error-bg text-arsm-error-text hover:bg-arsm-error-softest hover:text-arsm-error-text ${focusVisibleOutlineClass} disabled:cursor-not-allowed disabled:opacity-60 disabled:border-ui-border disabled:bg-ui-toggle disabled:text-ui-muted disabled:hover:bg-ui-toggle disabled:hover:text-ui-muted dark:border-arsm-error-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/85 dark:hover:text-arsm-error-text-light ${iconButtonMicroInteractionClass}`;

/** Compact chip core (geometry, typography, focus, disabled) without the 44px touch sizing, which each chip base adds at its own breakpoint. */
const compactChipCoreClass = `inline-flex min-h-7 min-w-0 max-w-full shrink-0 items-center justify-center gap-1 rounded-xl border px-2.5 py-0.5 text-xs font-semibold leading-normal tracking-normal whitespace-nowrap transition-colors ${focusVisibleOutlineClass} disabled:cursor-not-allowed disabled:opacity-60`;
/** Neutral chip tone; it matches the compact filter select surface (bg-card, field border) it sits beside. */
const compactChipNeutralToneClass = 'border-ui-field-border bg-arsm-card text-ui-label hover:bg-ui-toggle dark:bg-arsm-input-dark';

/** Compact chip button base shared by Customers and Scheduler local chip variants (min-h-7, scales to a 44px target below the sm breakpoint (640px)). */
export const compactChipActionBaseClass = `${compactChipCoreClass} max-sm:min-h-11 max-sm:px-3 max-sm:py-2`;
/** Compact chip variants; the neutral one matches the compact filter select surface (bg-card, field border) it sits beside. */
export const compactChipNeutralButtonClass = `${compactChipActionBaseClass} ${compactChipNeutralToneClass}`;
export const compactChipPrimaryButtonClass = `${compactChipActionBaseClass} ${primaryActionToneClass}`;
export const compactChipDangerButtonClass = `${compactChipActionBaseClass} ${dangerActionToneClass}`;

/** Filter chips: the compact chips with the 44px touch target below lg (1024px) instead of sm, for controls beside the filter select. */
export const compactFilterChipActionBaseClass = `${compactChipCoreClass} max-lg:min-h-11 max-lg:px-3 max-lg:py-2`;
export const compactFilterChipNeutralButtonClass = `${compactFilterChipActionBaseClass} ${compactChipNeutralToneClass}`;

/** Row-level 44x44 icon actions (vehicle/quote/catalog rows, card expand toggles): scale + tone-background hover whose icon color never loses contrast (darkest tone text in light, lightest in dark); disabled renders neutral grey with no hover. */
const rowIconActionBaseClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:text-ui-muted disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-ui-muted ${iconButtonMicroInteractionClass} ${focusVisibleOutlineClass}`;
export const rowIconActionInfoClass = `${rowIconActionBaseClass} text-ui-info-text hover:bg-ui-info-bg hover:text-ui-info-text`;
export const rowIconActionWarningClass = `${rowIconActionBaseClass} text-ui-warning-text hover:bg-ui-warning-bg hover:text-ui-warning-text`;
export const rowIconActionDangerClass = `${rowIconActionBaseClass} text-arsm-error-active hover:bg-ui-error-bg hover:text-arsm-error-text dark:text-arsm-error-text-light dark:hover:text-arsm-error-text-light`;
export const rowIconActionAccentClass = `${rowIconActionBaseClass} text-arsm-accent-vivid hover:bg-arsm-accent-wash hover:text-arsm-accent-deep dark:text-arsm-accent dark:hover:bg-arsm-accent-dark/35 dark:hover:text-arsm-accent-dark-hover`;
export const rowIconActionNeutralClass = `${rowIconActionBaseClass} text-ui-muted hover:bg-ui-toggle hover:text-ui-text`;

/** Option tile primitives used by selectable cards and grouped checkbox-like controls; the active tile marks itself with a 1px outline. */
export const optionTileBaseClass = 'arsm-focus-outline relative inline-flex h-11 min-h-11 w-auto max-w-full shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border px-3 py-2 text-xs transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ui-focus disabled:cursor-not-allowed';
export const optionTileActiveClass = 'border-ui-accent bg-ui-toggle text-ui-text outline-1 outline-arsm-accent/25 dark:outline-arsm-accent-dark/30';
export const optionTileInactiveClass = 'border-ui-border bg-ui-input text-ui-label hover:bg-ui-toggle';
export const optionTileCheckboxClass = 'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-md border';
export const optionTileCheckboxActiveClass = 'border-ui-accent bg-ui-accent';
export const optionTileCheckboxInactiveClass = 'border-ui-border bg-transparent';
export const hiddenCheckboxClass = 'pointer-events-none absolute opacity-0';

/** Segmented controls used where two-state mode switching is required (for example view mode toggles). */
export const segmentedControlClass = 'grid min-w-0 grid-cols-2 gap-1.5 rounded-xl bg-ui-toggle p-1.5';

const segmentedControlOptionBaseClass = `inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition ${focusVisibleOutlineClass} disabled:cursor-not-allowed disabled:opacity-60`;
const segmentedControlOptionActiveClass = 'border border-arsm-accent/80 bg-ui-accent text-ui-on-accent outline-1 outline-arsm-accent-deep/20 dark:border-arsm-accent-dark/85 dark:outline-arsm-accent-dark/35';
const segmentedControlOptionInactiveClass = 'bg-transparent text-ui-label hover:bg-arsm-accent-subtle dark:hover:bg-arsm-hover-dark';

/** Resolves the segmented-control option classes for the active or inactive state. */
export const getSegmentedControlOptionClass = (isActive: boolean): string =>
  `${segmentedControlOptionBaseClass} ${isActive ? segmentedControlOptionActiveClass : segmentedControlOptionInactiveClass}`;

/** Canonical medium button family for contextual panel/card actions. */
const mediumContextActionShapeClass = `inline-flex min-w-0 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold leading-normal disabled:cursor-not-allowed disabled:opacity-60 ${buttonMicroInteractionClass} ${focusVisibleOutlineClass}`;
const mediumContextActionBaseClass = `${mediumContextActionShapeClass} h-11 min-h-11 whitespace-nowrap`;
/** Same shape as the medium base, but the label may wrap and the button grows from the 44px minimum height. */
const mediumContextActionWrapBaseClass = `${mediumContextActionShapeClass} min-h-11 whitespace-normal`;

const mediumContextNeutralToneClass = 'border-ui-border bg-ui-toggle text-ui-label hover:border-ui-accent/45 hover:bg-arsm-accent-wash dark:hover:bg-arsm-hover-dark/90';
export const mediumContextNeutralButtonClass = `${mediumContextActionBaseClass} ${mediumContextNeutralToneClass}`;
export const mediumContextNeutralWrapButtonClass = `${mediumContextActionWrapBaseClass} ${mediumContextNeutralToneClass}`;
export const mediumContextPrimaryButtonClass = `${mediumContextActionBaseClass} ${primaryActionToneClass}`;
export const mediumContextPrimaryWrapButtonClass = `${mediumContextActionWrapBaseClass} ${primaryActionToneClass}`;
export const mediumContextDangerButtonClass = `${mediumContextActionBaseClass} ${dangerActionToneClass}`;

/** Canonical main CTA family for save/delete/edit and modal confirmation actions. */
const mainCtaActionBaseClass = `inline-flex h-11 min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 max-[350px]:w-full ${buttonMicroInteractionClass} ${focusVisibleOutlineClass}`;

export const mainCtaNeutralButtonClass = `${mainCtaActionBaseClass} border border-ui-border bg-ui-toggle font-medium text-ui-label hover:bg-arsm-accent-subtle dark:hover:bg-arsm-hover-dark`;
export const mainCtaPrimaryButtonClass = `${mainCtaActionBaseClass} bg-ui-accent font-semibold text-ui-on-accent hover:bg-ui-accent-hover`;
export const mainCtaDangerButtonClass = `${mainCtaActionBaseClass} border border-arsm-error-border bg-ui-error-bg font-semibold text-arsm-error-text hover:bg-arsm-error-soft dark:border-arsm-error-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80`;

/** Reference chips: canonical action sizes for details panels, compact toolbars, and history actions. */
export const referenceChipNeutralButtonClass = mediumContextNeutralButtonClass;
/** Neutral reference chip whose label wraps (long localized labels at 320px). */
export const referenceChipNeutralWrapButtonClass = mediumContextNeutralWrapButtonClass;
export const referenceChipPrimaryWrapButtonClass = mediumContextPrimaryWrapButtonClass;
export const referenceChipPrimaryButtonClass = mediumContextPrimaryButtonClass;
export const referenceChipDangerButtonClass = mediumContextDangerButtonClass;

/** Binary pill toggle helper used by compact on/off filter controls. */
const togglePillBaseClass = `inline-flex h-11 min-h-11 min-w-11 max-w-full items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 max-[350px]:w-full ${buttonMicroInteractionClass} ${focusVisibleOutlineClass}`;
const togglePillActiveClass = 'border-arsm-accent/80 bg-ui-accent text-ui-on-accent outline-1 outline-arsm-accent-deep/20 dark:border-arsm-accent-dark/85 dark:outline-arsm-accent-dark/35';
const togglePillInactiveClass = 'border-ui-border bg-ui-toggle text-ui-label hover:border-ui-accent/50 hover:bg-arsm-accent-subtle dark:hover:bg-arsm-hover-dark';

/** Resolves the binary toggle-pill classes for the on or off state. */
export const getTogglePillClass = (isActive: boolean): string =>
  `${togglePillBaseClass} ${isActive ? togglePillActiveClass : togglePillInactiveClass}`;

/** Legacy aliases kept so older components can migrate incrementally. */
export const buttonClass = mainCtaPrimaryButtonClass;
export const secondaryButtonClass = mainCtaNeutralButtonClass;
export const dangerButtonClass = mainCtaDangerButtonClass;