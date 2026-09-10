/** Shared button, action, option, and segmented-control style primitives. */

/** Shared hover/focus micro-motion for clickable controls (buttons/chips/icon actions). */
const buttonMicroInteractionClass = 'transition-[background-color,border-color,color,transform] duration-150 ease-out hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-colors [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-out hover:[&_svg]:translate-x-[1px] motion-reduce:[&_svg]:transform-none';

/** Hover micro-motion dedicated to icon-only controls: no hover surface fill, just subtle scale. */
const iconButtonMicroInteractionClass = 'transition-[color,transform] duration-150 ease-out hover:scale-110 motion-reduce:transform-none';

/** Focus-visible ring geometry; each variant adds its own ring color so the two never conflict. */
const focusRingGeometryClass = 'focus-visible:outline-none focus-visible:ring-2';

/** Accent focus ring used by neutral, primary, and toggle variants. */
const focusRingAccentClass = 'focus-visible:ring-arsm-focus-ring/40 dark:focus-visible:ring-arsm-focus-ring/30';

/** Error focus ring used by danger variants, matching iconDangerButtonClass. */
const focusRingDangerClass = 'focus-visible:ring-arsm-error-hover/40 dark:focus-visible:ring-arsm-error-dark/40';

/** Generic utility and icon actions used in headers, toolbars, and modal close controls. */
export const compactUtilityButtonClass = `inline-flex h-11 min-h-11 min-w-[4.9rem] shrink-0 items-center justify-center rounded-2xl border border-arsm-accent/30 bg-arsm-accent-subtle/85 px-5 text-[12px] font-medium leading-normal text-arsm-primary hover:bg-arsm-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 max-[320px]:min-w-[3.9rem] max-[320px]:px-3.5 max-[320px]:text-[11px] dark:border-arsm-accent-dark/30 dark:bg-arsm-hover-dark/80 dark:text-arsm-primary-dark dark:hover:bg-arsm-hover-dark dark:focus-visible:ring-arsm-focus-ring/30 ${buttonMicroInteractionClass}`;
export const schedulerNavIconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-border bg-arsm-input text-arsm-label hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:border-arsm-border/60 disabled:opacity-50 disabled:hover:text-arsm-label dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:text-arsm-primary-dark dark:disabled:border-arsm-border-dark/60 dark:disabled:hover:text-arsm-label-dark ${iconButtonMicroInteractionClass}`;
export const sidebarShellIconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-2 text-arsm-label hover:text-arsm-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:text-arsm-label-dark dark:hover:text-arsm-primary-dark ${iconButtonMicroInteractionClass}`;
export const modalConfirmCloseButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-arsm-muted hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-50 dark:text-arsm-muted-dark dark:hover:text-arsm-primary-dark ${iconButtonMicroInteractionClass}`;
export const iconDangerButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-error-border bg-arsm-error-bg text-arsm-error-text hover:text-arsm-error-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-error-hover/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:text-arsm-error-text-light dark:focus-visible:ring-arsm-error-dark/40 ${iconButtonMicroInteractionClass}`;

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

export const getSegmentedControlOptionClass = (isActive: boolean): string =>
	`${segmentedControlOptionBaseClass} ${isActive ? segmentedControlOptionActiveClass : segmentedControlOptionInactiveClass}`;

/** Canonical medium button family for contextual panel/card actions. */
const mediumContextActionBaseClass = `inline-flex h-11 min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold leading-normal whitespace-nowrap ring-1 ring-transparent disabled:cursor-not-allowed disabled:opacity-60 ${buttonMicroInteractionClass} ${focusRingGeometryClass}`;

export const mediumContextNeutralButtonClass = `${mediumContextActionBaseClass} border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/45 hover:bg-arsm-accent-wash dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/45 dark:hover:bg-arsm-hover-dark/90 ${focusRingAccentClass}`;
export const mediumContextPrimaryButtonClass = `${mediumContextActionBaseClass} border-arsm-accent/60 bg-arsm-accent-subtle text-arsm-primary hover:border-arsm-accent hover:bg-arsm-accent-wash dark:border-arsm-accent-dark/60 dark:bg-arsm-accent-dark/25 dark:text-arsm-primary-dark dark:hover:border-arsm-accent-dark dark:hover:bg-arsm-accent-dark/35 ${focusRingAccentClass}`;
export const mediumContextDangerButtonClass = `${mediumContextActionBaseClass} border-arsm-error-border/75 bg-arsm-error-bg text-arsm-error-text hover:border-arsm-error-text/40 hover:bg-arsm-error-soft dark:border-arsm-error-dark/75 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:border-arsm-error-text-light/35 dark:hover:bg-arsm-error-bg-dark/85 ${focusRingDangerClass}`;

/** Canonical main CTA family for save/delete/edit and modal confirmation actions. */
const mainCtaActionBaseClass = `inline-flex h-11 min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 max-[350px]:w-full ${buttonMicroInteractionClass} ${focusRingGeometryClass}`;

export const mainCtaNeutralButtonClass = `${mainCtaActionBaseClass} border border-arsm-border bg-arsm-toggle-bg font-medium text-arsm-label hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark ${focusRingAccentClass}`;
export const mainCtaPrimaryButtonClass = `${mainCtaActionBaseClass} bg-arsm-accent font-semibold text-arsm-on-accent hover:bg-arsm-accent-hover dark:bg-arsm-accent-dark dark:text-arsm-on-accent-dark dark:hover:bg-arsm-accent-dark-hover ${focusRingAccentClass}`;
export const mainCtaDangerButtonClass = `${mainCtaActionBaseClass} border border-arsm-error-border bg-arsm-error-bg font-semibold text-arsm-error-text hover:bg-arsm-error-soft dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80 ${focusRingDangerClass}`;

/** Reference chips: canonical action sizes for details panels, compact toolbars, and history actions. */
export const referenceChipNeutralButtonClass = mediumContextNeutralButtonClass;
export const referenceChipPrimaryButtonClass = mediumContextPrimaryButtonClass;
export const referenceChipDangerButtonClass = mediumContextDangerButtonClass;

/** Binary pill toggle helper used by compact on/off filter controls. */
const togglePillBaseClass = `inline-flex h-11 min-h-11 min-w-11 max-w-full items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 max-[350px]:w-full ${buttonMicroInteractionClass} ${focusRingGeometryClass} ${focusRingAccentClass}`;
const togglePillActiveClass = 'border-arsm-accent/80 bg-arsm-accent text-arsm-on-accent ring-1 ring-arsm-accent-deep/20 dark:border-arsm-accent-dark/85 dark:bg-arsm-accent-dark dark:text-arsm-on-accent-dark dark:ring-arsm-accent-dark/35';
const togglePillInactiveClass = 'border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/50 hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/50 dark:hover:bg-arsm-hover-dark';

export const getTogglePillClass = (isActive: boolean): string =>
	`${togglePillBaseClass} ${isActive ? togglePillActiveClass : togglePillInactiveClass}`;

/** Legacy aliases kept so older components can migrate incrementally. */
export const buttonClass = mainCtaPrimaryButtonClass;
export const secondaryButtonClass = mainCtaNeutralButtonClass;
export const dangerButtonClass = mainCtaDangerButtonClass;