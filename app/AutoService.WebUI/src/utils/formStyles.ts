/**
 * Shared Tailwind CSS class strings for form elements.
 * @module utils/formStyles
 */

/** Standard full-width input field with light/dark focus states. */
export const inputClass = 'min-h-11 w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-2.5 text-[15px] text-arsm-primary placeholder-arsm-placeholder outline-none transition duration-200 focus-visible:-translate-y-px focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 max-[320px]:px-3 max-[320px]:py-2 max-[320px]:text-sm dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/28';

/** Compact input variant with smaller padding, used in detail modal edit fields. */
export const inputClassCompact = 'w-full rounded-xl border border-arsm-border bg-arsm-input px-2 py-1 text-sm text-arsm-primary outline-none transition focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:focus-visible:ring-arsm-focus-ring/24';

/** Intake-oriented input variant used by scheduler intake controls. */
export const intakeInputClass = 'min-h-11 min-w-0 max-w-full w-full rounded-xl border border-arsm-border bg-arsm-input/90 px-3.5 py-2 text-sm text-arsm-primary placeholder-arsm-placeholder outline-none transition duration-200 focus-visible:-translate-y-px focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark/95 dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:ring-arsm-focus-ring/24';

/** Scheduler intake textarea variant. */
export const intakeTextareaClass = `${intakeInputClass} resize-y`;

/** Scheduler intake datetime input variant with native picker tuning hook. */
export const intakeDateTimeInputClass = `intake-datetime-input ${intakeInputClass}`;

/** Compact select/input field variant for dense scheduler controls. */
export const compactSelectClass = 'h-10 min-h-0 rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 text-sm text-arsm-primary transition focus-visible:border-arsm-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-arsm-border focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:focus-visible:border-arsm-border-dark dark:focus-visible:outline-arsm-border-dark';

/** Full-width compact select with truncation for bounded wrappers. */
export const compactSelectFullClass = `${compactSelectClass} w-full min-w-0 max-w-full truncate`;

/** Bounded wrapper for select controls and dropdown filters. */
export const selectWrapperClass = 'min-w-0 max-w-full overflow-hidden';

/** Content-fit grouped control width for short labels in the same local group. */
export const groupedControlWidthClass = 'min-w-0 basis-full max-[350px]:basis-full sm:basis-auto sm:min-w-[7.75rem] sm:max-w-[9.25rem]';

/** Wider grouped control width for labels that must match longer local options. */
export const groupedControlWideWidthClass = 'min-w-0 basis-full max-[350px]:basis-full sm:basis-auto sm:min-w-[8.5rem] sm:max-w-[10rem]';

/** Wrapper used around standard form labels and controls. */
export const formFieldGroupClass = 'min-w-0 max-w-full';

/** Responsive grid for form fields that collapses cleanly at narrow widths. */
export const formFieldGridClass = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2';

/** Responsive row for independent controls in the same logical group. */
export const controlRowClass = 'arsm-control-row';

/** Visual wrapper for compact control panels and filter bands. */
export const controlPanelClass = 'arsm-control-panel';

/** Footer/action wrapper for modal and form submit groups. */
export const controlPanelFooterClass = 'arsm-modal-footer';

/** Equal local-width action group for buttons that belong to one control set. */
export const equalWidthControlGroupClass = 'arsm-equal-control-group';

/** Generic button group wrapper that keeps controls tappable before wrapping. */
export const buttonGroupClass = 'arsm-button-group';

/** Relative input container for search/password overlay controls. */
export const inputGroupContainerClass = 'relative min-w-0 max-w-full';

/** Left-side decorative/search icon inside an input group. */
export const inputGroupIconClass = 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-arsm-muted dark:text-arsm-muted-dark';

/** Text input variant with shared right/left overlay spacing. */
export const searchInputClass = `${inputClass} pl-10 pr-12 text-sm`;

/** Icon-only action button used inside search/password inputs. */
export const inputGroupOverlayButtonClass = 'absolute right-1 top-1/2 inline-flex h-11 w-11 shrink-0 -translate-y-1/2 items-center justify-center rounded-xl text-arsm-label transition hover:bg-arsm-toggle-bg hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-60 dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:text-arsm-primary-dark';

/** Password visibility action button with shared overlay treatment. */
export const passwordToggleButtonClass = inputGroupOverlayButtonClass;

/** Search clear action button with shared overlay treatment. */
export const searchClearButtonClass = inputGroupOverlayButtonClass;

/** Compact utility toggle used by global theme/language controls. */
export const compactUtilityButtonClass = 'inline-flex min-h-11 min-w-[3.5rem] shrink-0 items-center justify-center rounded-xl border border-arsm-accent/45 bg-arsm-accent px-4 text-sm font-semibold leading-none text-arsm-primary transition hover:-translate-y-px hover:bg-arsm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 max-[320px]:min-w-[3rem] max-[320px]:px-3 max-[320px]:text-xs dark:border-arsm-accent-dark/45 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:focus-visible:ring-arsm-focus-ring/35';

/** Neutral 44px icon-only button. */
export const iconButtonClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-border bg-arsm-input text-arsm-label transition hover:-translate-y-px hover:bg-arsm-toggle-bg hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:text-arsm-primary-dark';

/** Destructive 44px icon-only button. */
export const iconDangerButtonClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-error-border bg-transparent text-arsm-error-accent transition hover:-translate-y-px hover:bg-arsm-error-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-error-hover/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-arsm-error-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark dark:focus-visible:ring-arsm-error-dark/40';

/** Base checkbox option tile for reusable multi-select pickers. */
export const optionTileBaseClass = 'relative inline-flex h-9 min-h-0 w-auto max-w-full shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-1.5 text-xs transition disabled:cursor-not-allowed';

/** Active checkbox option tile state. */
export const optionTileActiveClass = 'border-arsm-accent bg-arsm-toggle-bg text-arsm-primary dark:border-arsm-accent-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-hover';

/** Inactive checkbox option tile state. */
export const optionTileInactiveClass = 'border-arsm-border bg-arsm-card text-arsm-label hover:bg-arsm-input dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-label-dark dark:hover:bg-arsm-input-dark';

/** Checkbox indicator box used inside option tiles. */
export const optionTileCheckboxClass = 'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-md border';

/** Active checkbox indicator state used inside option tiles. */
export const optionTileCheckboxActiveClass = 'border-arsm-accent bg-arsm-accent dark:border-arsm-accent-dark dark:bg-arsm-accent-dark';

/** Inactive checkbox indicator state used inside option tiles. */
export const optionTileCheckboxInactiveClass = 'border-arsm-border bg-transparent dark:border-arsm-border-dark';

/** Hidden native checkbox input used by option tiles. */
export const hiddenCheckboxClass = 'pointer-events-none absolute opacity-0';

/** Shared segmented control container. */
export const segmentedControlClass = 'grid min-w-0 grid-cols-2 gap-1.5 rounded-xl bg-arsm-toggle-bg p-1.5 dark:bg-arsm-toggle-bg-dark';

const segmentedControlOptionBaseClass = 'inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-60';
const segmentedControlOptionActiveClass = 'bg-arsm-accent text-arsm-primary dark:bg-arsm-accent-dark dark:text-arsm-hover';
const segmentedControlOptionInactiveClass = 'bg-transparent text-arsm-label hover:bg-arsm-accent-subtle dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark';

/** Returns class names for segmented control option buttons. */
export const getSegmentedControlOptionClass = (isActive: boolean): string =>
	`${segmentedControlOptionBaseClass} ${isActive ? segmentedControlOptionActiveClass : segmentedControlOptionInactiveClass}`;

/** Wrapper used around intake field labels and controls. */
export const intakeFieldWrapperClass = 'flex min-w-0 flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark';

/** Bold label text inside intake field wrappers. */
export const intakeFieldLabelClass = 'font-medium';

/** Shared scheduler detail section panel surface. */
export const schedulerDetailPanelClass = 'rounded-2xl border border-arsm-border bg-arsm-input/80 p-3.5 dark:border-arsm-border-dark dark:bg-arsm-input-dark/65';

/** Shared scheduler detail row surface for compact key/value lines. */
export const schedulerDetailRowClass = 'rounded-xl border border-arsm-border bg-arsm-toggle-bg/90 px-3 py-2 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark/80';

/** Shared accent specialization tag used in scheduler mechanic rows. */
export const schedulerAccentTagClass = 'max-w-full truncate rounded-full border border-arsm-accent/25 bg-arsm-accent-wash px-2.5 py-0.5 text-xs font-semibold text-arsm-accent-vivid dark:border-arsm-accent-dark/30 dark:bg-arsm-hover-dark dark:text-arsm-accent';

/** Small primary action button used in dense scheduler action clusters. */
export const schedulerMiniPrimaryActionButtonClass = 'group pointer-events-auto inline-flex min-h-11 max-w-full min-w-0 items-center justify-center gap-1.5 rounded-full border border-arsm-accent/45 bg-arsm-accent-wash px-3 py-1.5 text-xs font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:border-arsm-accent hover:bg-arsm-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-arsm-accent-dark/45 dark:bg-arsm-hover-dark dark:text-arsm-primary-dark dark:hover:border-arsm-accent-dark dark:hover:bg-arsm-toggle-bg-dark';

/** Small neutral action button used in scheduler filter/tool clusters. */
export const schedulerMiniNeutralActionButtonClass = 'inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-1.5 rounded-full border border-arsm-border bg-arsm-card px-3 py-1.5 text-xs font-semibold text-arsm-label transition-colors max-[350px]:basis-full dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark';

/** Shared compact action button base for dense table/list controls. */
export const compactActionButtonBaseClass = 'inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition max-[350px]:w-full';

/** Neutral compact action button variant. */
export const compactActionButtonNeutralClass = `${compactActionButtonBaseClass} border border-arsm-border text-arsm-label hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark`;

/** Accent compact action button variant. */
export const compactActionButtonAccentClass = `${compactActionButtonBaseClass} border border-arsm-accent/45 bg-arsm-accent-subtle font-semibold text-arsm-primary hover:-translate-y-px hover:bg-arsm-accent-wash dark:border-arsm-accent-dark/45 dark:bg-arsm-hover-dark dark:text-arsm-primary-dark dark:hover:bg-arsm-toggle-bg-dark`;

/** Danger compact action button variant. */
export const compactActionButtonDangerClass = `${compactActionButtonBaseClass} border border-arsm-error-border text-arsm-error-accent hover:bg-arsm-error-bg dark:border-arsm-error-border-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark`;

/** Small danger action button used in dense scheduler action clusters. */
export const schedulerMiniDangerActionButtonClass = 'group pointer-events-auto inline-flex min-h-11 w-auto shrink-0 items-center gap-1 rounded-xl border border-arsm-error-border/70 bg-arsm-error-bg px-2.5 py-1.5 text-xs font-medium text-arsm-error-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-softest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:opacity-50 max-[350px]:w-full max-[350px]:justify-center dark:border-arsm-error-dark/70 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80';

/** Strong small danger action button variant used by scheduler card actions. */
export const schedulerMiniDangerStrongActionButtonClass = 'group pointer-events-auto inline-flex min-h-11 max-w-full min-w-0 items-center justify-center gap-1.5 rounded-full border border-arsm-error-border/70 bg-arsm-error-bg px-3 py-1.5 text-xs font-semibold text-arsm-error-text transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-softest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-arsm-error-dark/70 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80';

const togglePillBaseClass = 'inline-flex h-10 min-h-0 min-w-0 max-w-full items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 max-[350px]:w-full';
const togglePillActiveClass = 'border-arsm-accent/60 bg-arsm-accent text-arsm-primary dark:border-arsm-accent-dark/60 dark:bg-arsm-accent-dark dark:text-arsm-hover';
const togglePillInactiveClass = 'border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/50 hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/50 dark:hover:bg-arsm-hover-dark';

/** Returns class names for segmented toggle/pill buttons. */
export const getTogglePillClass = (isActive: boolean): string =>
	`${togglePillBaseClass} ${isActive ? togglePillActiveClass : togglePillInactiveClass}`;

/** Read-only input field with muted background and cursor-not-allowed. */
export const readonlyInputClass = 'min-h-11 w-full cursor-not-allowed rounded-xl border border-arsm-border bg-arsm-surface px-4 py-2.5 text-[15px] text-arsm-label outline-none max-[320px]:px-3 max-[320px]:py-2 max-[320px]:text-sm dark:border-arsm-border-dark dark:bg-arsm-deepest dark:text-arsm-placeholder-dark';

/** Standard form label with muted color in both themes. */
export const labelClass = 'mb-1.5 block text-sm font-medium text-arsm-label dark:text-arsm-label-dark';

/** Rounded form surface container shared by settings, admin, and scheduler forms. */
export const cardClass = 'arsm-card-surface';

/** Inset panel surface for summary strips, intake blocks, and helper sections. */
export const insetSurfaceClass = 'arsm-surface-inset';

/** Primary action button with accent color and disabled states. */
export const buttonClass = 'arsm-btn-primary';

/** Secondary action button with neutral border treatment. */
export const secondaryButtonClass = 'arsm-btn-secondary';

/** Destructive action button with semantic error treatment. */
export const dangerButtonClass = 'arsm-btn-danger';

/** Standard responsive page container used by most top-level pages. */
export const pageShellClass = 'arsm-page-shell';

/** Narrow inner page container used for form-centric pages. */
export const pageShellNarrowClass = 'arsm-page-shell-narrow';

/** Compact responsive page container used by placeholder/info pages. */
export const pageShellCompactClass = 'arsm-page-shell-compact';

/** Standard page header container with bottom spacing. */
export const pageHeaderClass = 'arsm-page-header';

/** Page header variant for title + subtitle stacks. */
export const pageHeaderWithSubtitleClass = 'arsm-page-header-with-subtitle';

/** Standard page title typography token. */
export const pageTitleClass = 'arsm-page-title';

/** Standard page subtitle typography token. */
export const pageSubtitleClass = 'arsm-page-subtitle';

/** Vertical stack for grouping page sections. */
export const sectionStackClass = 'arsm-section-stack';

/** Standard section title typography token used inside cards/forms. */
export const sectionTitleClass = 'arsm-section-title';

/** Responsive wrapping action cluster used by dense toolbar/button groups. */
export const actionClusterClass = 'arsm-action-cluster';

/** Shared fixed-width icon slot used in sidebar rows for visual alignment. */
export const sidebarIconSlotClass = 'inline-flex h-10 w-[52px] flex-shrink-0 items-center justify-center';
