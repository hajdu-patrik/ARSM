/** Shared button, action, option, and segmented-control style primitives. */

/** Shared hover/focus micro-motion for clickable controls (buttons/chips/icon actions). */
const buttonMicroInteractionClass = 'transition-[background-color,border-color,color,transform] duration-150 ease-out hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-colors [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-out hover:[&_svg]:translate-x-[1px] motion-reduce:[&_svg]:transform-none';

/** Hover micro-motion dedicated to icon-only controls: no hover surface fill, just subtle scale. */
const iconButtonMicroInteractionClass = 'transition-[color,transform] duration-150 ease-out hover:scale-110 motion-reduce:transform-none';

/** Generic utility and icon actions used in headers, toolbars, and modal close controls. */
export const compactUtilityButtonClass = `inline-flex h-11 min-h-11 min-w-[4.9rem] shrink-0 items-center justify-center rounded-2xl border border-arsm-accent/30 bg-arsm-accent-subtle/85 px-5 text-[12px] font-medium leading-normal text-arsm-primary hover:bg-arsm-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 max-[320px]:min-w-[3.9rem] max-[320px]:px-3.5 max-[320px]:text-[11px] dark:border-arsm-accent-dark/30 dark:bg-arsm-hover-dark/80 dark:text-arsm-primary-dark dark:hover:bg-arsm-hover-dark dark:focus-visible:ring-arsm-focus-ring/30 ${buttonMicroInteractionClass}`;
export const iconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-border bg-arsm-input text-arsm-label hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:text-arsm-primary-dark ${iconButtonMicroInteractionClass}`;
export const schedulerNavIconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-border bg-arsm-input text-arsm-label hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:border-arsm-border/60 disabled:opacity-50 disabled:hover:text-arsm-label dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:text-arsm-primary-dark dark:disabled:border-arsm-border-dark/60 dark:disabled:hover:text-arsm-label-dark ${iconButtonMicroInteractionClass}`;
export const sidebarShellIconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-2 text-arsm-label hover:text-arsm-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:text-arsm-label-dark dark:hover:text-arsm-primary-dark ${iconButtonMicroInteractionClass}`;
export const modalConfirmCloseButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-arsm-muted hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-50 dark:text-arsm-muted-dark dark:hover:text-arsm-primary-dark ${iconButtonMicroInteractionClass}`;
export const iconDangerButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-error-border bg-arsm-error-bg text-arsm-error-text hover:text-arsm-error-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-error-hover/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:text-arsm-error-text-light dark:focus-visible:ring-arsm-error-dark/40 ${iconButtonMicroInteractionClass}`;

/** Option tile primitives used by selectable cards and grouped checkbox-like controls. */
export const optionTileBaseClass = 'relative inline-flex h-11 min-h-11 w-auto max-w-full shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border px-3 py-2 text-xs transition disabled:cursor-not-allowed';
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

/** Canonical small button family for compact filter/meta/category actions. */
const smallMetaActionBaseClass = `inline-flex h-11 min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold leading-normal whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 ${buttonMicroInteractionClass}`;

export const smallMetaNeutralButtonClass = `${smallMetaActionBaseClass} border-arsm-border bg-arsm-card text-arsm-label hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark`;
export const smallMetaPrimaryButtonClass = `${smallMetaActionBaseClass} border-arsm-accent/70 bg-arsm-accent-subtle text-arsm-primary hover:border-arsm-accent hover:bg-arsm-accent-wash dark:border-arsm-accent-dark/70 dark:bg-arsm-accent-dark/25 dark:text-arsm-primary-dark dark:hover:border-arsm-accent-dark dark:hover:bg-arsm-accent-dark/35`;
export const smallMetaDangerButtonClass = `${smallMetaActionBaseClass} border-arsm-error-border/75 bg-arsm-error-bg text-arsm-error-text hover:border-arsm-error-text/40 hover:bg-arsm-error-soft dark:border-arsm-error-dark/75 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:border-arsm-error-text-light/35 dark:hover:bg-arsm-error-bg-dark/85`;

/** Canonical medium button family for contextual panel/card actions. */
const mediumContextActionBaseClass = `inline-flex h-11 min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold leading-normal whitespace-nowrap ring-1 ring-transparent disabled:cursor-not-allowed disabled:opacity-60 ${buttonMicroInteractionClass}`;

export const mediumContextNeutralButtonClass = `${mediumContextActionBaseClass} border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/45 hover:bg-arsm-accent-wash dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/45 dark:hover:bg-arsm-hover-dark/90`;
export const mediumContextPrimaryButtonClass = `${mediumContextActionBaseClass} border-arsm-accent/60 bg-arsm-accent-subtle text-arsm-primary hover:border-arsm-accent hover:bg-arsm-accent-wash dark:border-arsm-accent-dark/60 dark:bg-arsm-accent-dark/25 dark:text-arsm-primary-dark dark:hover:border-arsm-accent-dark dark:hover:bg-arsm-accent-dark/35`;
export const mediumContextDangerButtonClass = `${mediumContextActionBaseClass} border-arsm-error-border/75 bg-arsm-error-bg text-arsm-error-text hover:border-arsm-error-text/40 hover:bg-arsm-error-soft dark:border-arsm-error-dark/75 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:border-arsm-error-text-light/35 dark:hover:bg-arsm-error-bg-dark/85`;

/** Canonical main CTA family for save/delete/edit and modal confirmation actions. */
const mainCtaActionBaseClass = `inline-flex h-11 min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 max-[350px]:w-full ${buttonMicroInteractionClass}`;

export const mainCtaNeutralButtonClass = `${mainCtaActionBaseClass} border border-arsm-border bg-arsm-toggle-bg font-medium text-arsm-label hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark`;
export const mainCtaPrimaryButtonClass = `${mainCtaActionBaseClass} bg-arsm-accent font-semibold text-arsm-on-accent hover:bg-arsm-accent-hover dark:bg-arsm-accent-dark dark:text-arsm-on-accent-dark dark:hover:bg-arsm-accent-dark-hover`;
export const mainCtaDangerButtonClass = `${mainCtaActionBaseClass} border border-arsm-error-border bg-arsm-error-bg font-semibold text-arsm-error-text hover:bg-arsm-error-soft dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80`;

/** Scheduler action chips used inside appointment cards and detail panels. */
export const schedulerMiniPrimaryActionButtonClass = `group pointer-events-auto ${mediumContextPrimaryButtonClass}`;
export const schedulerMiniNeutralActionButtonClass = `${mediumContextNeutralButtonClass} max-[350px]:basis-full`;
export const schedulerInlineClaimButtonClass = `group ${mediumContextPrimaryButtonClass}`;
export const schedulerInlineUnassignButtonClass = `group ${mediumContextDangerButtonClass}`;

/** Compact list and filter actions used in Customers/Scheduler tool rows. */
export const compactActionButtonBaseClass = `inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium max-[350px]:w-full ${buttonMicroInteractionClass}`;
export const compactActionButtonNeutralClass = `${compactActionButtonBaseClass} border border-arsm-border text-arsm-label hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark`;
export const compactSortToggleButtonClass = `${smallMetaNeutralButtonClass} text-[11px]`;
export const schedulerFilterControlBaseClass = smallMetaNeutralButtonClass;
export const schedulerFilterChipButtonClass = schedulerFilterControlBaseClass;

/** Reference chips: canonical action sizes for details panels, compact toolbars, and history actions. */
export const referenceChipNeutralButtonClass = mediumContextNeutralButtonClass;
export const referenceChipPrimaryButtonClass = mediumContextPrimaryButtonClass;
export const referenceChipDangerButtonClass = mediumContextDangerButtonClass;
export const compactFilterChipNeutralButtonClass = smallMetaNeutralButtonClass;
export const compactFilterChipPrimaryButtonClass = smallMetaPrimaryButtonClass;

/** Full-height toolbar actions for primary page-level CRUD operations. */
export const customersToolbarNeutralButtonClass = mainCtaNeutralButtonClass;
export const customersToolbarPrimaryButtonClass = mainCtaPrimaryButtonClass;
export const customersToolbarDangerButtonClass = mainCtaDangerButtonClass;

export const compactActionButtonAccentClass = `${compactActionButtonBaseClass} border border-arsm-accent/45 bg-arsm-accent-subtle font-semibold text-arsm-primary hover:bg-arsm-accent-wash dark:border-arsm-accent-dark/45 dark:bg-arsm-hover-dark dark:text-arsm-primary-dark dark:hover:bg-arsm-toggle-bg-dark`;
export const compactActionButtonDangerClass = `${compactActionButtonBaseClass} border border-arsm-error-border bg-arsm-error-bg text-arsm-error-text hover:bg-arsm-error-soft dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80`;
export const schedulerMiniDangerActionButtonClass = `group pointer-events-auto ${mediumContextDangerButtonClass} max-[350px]:w-full max-[350px]:justify-center`;
export const schedulerMiniDangerStrongActionButtonClass = `group pointer-events-auto ${mediumContextDangerButtonClass}`;

/** Binary pill toggle helper used by compact on/off filter controls. */
const togglePillBaseClass = `inline-flex h-11 min-h-11 min-w-11 max-w-full items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 max-[350px]:w-full ${buttonMicroInteractionClass}`;
const togglePillActiveClass = 'border-arsm-accent/80 bg-arsm-accent text-arsm-on-accent ring-1 ring-arsm-accent-deep/20 dark:border-arsm-accent-dark/85 dark:bg-arsm-accent-dark dark:text-arsm-on-accent-dark dark:ring-arsm-accent-dark/35';
const togglePillInactiveClass = 'border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/50 hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/50 dark:hover:bg-arsm-hover-dark';

export const getTogglePillClass = (isActive: boolean): string =>
	`${togglePillBaseClass} ${isActive ? togglePillActiveClass : togglePillInactiveClass}`;

/** Legacy aliases kept so older components can migrate incrementally. */
export const buttonClass = mainCtaPrimaryButtonClass;
export const secondaryButtonClass = mainCtaNeutralButtonClass;
export const dangerButtonClass = mainCtaDangerButtonClass;