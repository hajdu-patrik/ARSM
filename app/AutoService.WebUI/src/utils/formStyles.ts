/**
 * Shared Tailwind CSS class strings for form elements.
 * @module utils/formStyles
 */

/** Standard full-width input field with light/dark focus states. */
export const inputClass = 'w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-3 text-[15px] text-arsm-primary placeholder-arsm-placeholder outline-none transition duration-200 focus-visible:-translate-y-px focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 max-[320px]:px-3 max-[320px]:py-2.5 max-[320px]:text-sm dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-focus-ring/28';

/** Compact input variant with smaller padding, used in detail modal edit fields. */
export const inputClassCompact = 'w-full rounded-lg border border-arsm-border bg-arsm-input px-2 py-1 text-sm text-arsm-primary outline-none transition focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:focus-visible:ring-arsm-focus-ring/24';

/** Intake-oriented input variant used by scheduler intake controls. */
export const intakeInputClass = 'w-full rounded-xl border border-arsm-border bg-arsm-input/90 px-3.5 py-2.5 text-sm text-arsm-primary placeholder-arsm-placeholder outline-none transition duration-200 focus-visible:-translate-y-px focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark/95 dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:ring-arsm-focus-ring/24';

/** Scheduler intake textarea variant. */
export const intakeTextareaClass = `${intakeInputClass} resize-y`;

/** Scheduler intake datetime input variant with native picker tuning hook. */
export const intakeDateTimeInputClass = `intake-datetime-input ${intakeInputClass}`;

/** Compact select/input field variant for dense scheduler controls. */
export const compactSelectClass = 'rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 text-sm text-arsm-primary transition focus-visible:border-arsm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:focus-visible:ring-arsm-focus-ring/22';

/** Wrapper used around intake field labels and controls. */
export const intakeFieldWrapperClass = 'flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark';

/** Bold label text inside intake field wrappers. */
export const intakeFieldLabelClass = 'font-medium';

/** Shared scheduler detail section panel surface. */
export const schedulerDetailPanelClass = 'rounded-2xl border border-arsm-border bg-arsm-input/80 p-3.5 dark:border-arsm-border-dark dark:bg-arsm-input-dark/65';

/** Shared scheduler detail row surface for compact key/value lines. */
export const schedulerDetailRowClass = 'rounded-xl border border-arsm-border bg-arsm-toggle-bg/90 px-3 py-2 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark/80';

/** Shared accent specialization tag used in scheduler mechanic rows. */
export const schedulerAccentTagClass = 'max-w-full truncate rounded-full border border-arsm-accent/25 bg-arsm-accent-wash px-2.5 py-0.5 text-xs font-semibold text-arsm-accent-vivid dark:border-arsm-accent-dark/30 dark:bg-arsm-hover-dark dark:text-arsm-accent';

/** Small primary action button used in dense scheduler action clusters. */
export const schedulerMiniPrimaryActionButtonClass = 'group pointer-events-auto inline-flex max-w-full min-w-0 items-center justify-center gap-1.5 rounded-lg border border-arsm-accent/45 bg-arsm-accent px-3 py-1.5 text-xs font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-arsm-accent-dark/45 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover';

/** Small neutral action button used in scheduler filter/tool clusters. */
export const schedulerMiniNeutralActionButtonClass = 'inline-flex min-w-0 max-w-full items-center justify-center gap-1 rounded-lg border border-arsm-border bg-arsm-accent-subtle px-3 py-1 text-xs font-medium text-arsm-label transition-colors max-[350px]:basis-full dark:border-arsm-border-dark dark:bg-arsm-hover-dark dark:text-arsm-label-dark';

/** Shared compact action button base for dense table/list controls. */
export const compactActionButtonBaseClass = 'inline-flex min-w-0 max-w-full items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition max-[350px]:w-full';

/** Neutral compact action button variant. */
export const compactActionButtonNeutralClass = `${compactActionButtonBaseClass} border border-arsm-border text-arsm-label hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark`;

/** Accent compact action button variant. */
export const compactActionButtonAccentClass = `${compactActionButtonBaseClass} border border-arsm-accent/45 bg-arsm-accent-subtle font-semibold text-arsm-primary hover:-translate-y-px hover:bg-arsm-accent-wash dark:border-arsm-accent-dark/45 dark:bg-arsm-hover-dark dark:text-arsm-primary-dark dark:hover:bg-arsm-toggle-bg-dark`;

/** Danger compact action button variant. */
export const compactActionButtonDangerClass = `${compactActionButtonBaseClass} border border-arsm-error-border text-arsm-error-accent hover:bg-arsm-error-bg dark:border-arsm-error-border-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark`;

/** Small danger action button used in dense scheduler action clusters. */
export const schedulerMiniDangerActionButtonClass = 'group pointer-events-auto inline-flex w-auto shrink-0 items-center gap-1 rounded-lg border border-arsm-error-border/70 bg-arsm-error-bg px-2.5 py-1 text-xs font-medium text-arsm-error-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-softest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:opacity-50 max-[350px]:w-full max-[350px]:justify-center dark:border-arsm-error-dark/70 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80';

/** Strong small danger action button variant used by scheduler card actions. */
export const schedulerMiniDangerStrongActionButtonClass = 'group pointer-events-auto inline-flex max-w-full min-w-0 items-center justify-center gap-1.5 rounded-lg border border-arsm-error-border/65 bg-arsm-error-bg px-3 py-1.5 text-xs font-semibold text-arsm-error-text transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-bg-dark/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-arsm-error-dark/65 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80';

const togglePillBaseClass = 'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50';
const togglePillActiveClass = 'border-arsm-accent/60 bg-arsm-accent text-arsm-primary dark:border-arsm-accent-dark/60 dark:bg-arsm-accent-dark dark:text-arsm-hover';
const togglePillInactiveClass = 'border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/50 hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/50 dark:hover:bg-arsm-hover-dark';

/** Returns class names for segmented toggle/pill buttons. */
export const getTogglePillClass = (isActive: boolean): string =>
	`${togglePillBaseClass} ${isActive ? togglePillActiveClass : togglePillInactiveClass}`;

/** Read-only input field with muted background and cursor-not-allowed. */
export const readonlyInputClass = 'w-full cursor-not-allowed rounded-xl border border-arsm-border bg-arsm-surface px-4 py-3 text-[15px] text-arsm-label outline-none max-[320px]:px-3 max-[320px]:py-2.5 max-[320px]:text-sm dark:border-arsm-border-dark dark:bg-arsm-deepest dark:text-arsm-placeholder-dark';

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
