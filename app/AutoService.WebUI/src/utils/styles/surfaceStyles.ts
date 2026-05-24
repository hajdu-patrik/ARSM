/** Shared surface, content, card, panel, and layout style primitives. */

/** Shared layout wrappers for grouped control rows and modal/footer action zones. */
export const controlRowClass = 'arsm-control-row';
export const controlPanelClass = 'arsm-control-panel';
export const controlPanelFooterClass = 'arsm-modal-footer';
export const equalWidthControlGroupClass = 'arsm-equal-control-group';
export const buttonGroupClass = 'arsm-button-group';

/** Scheduler details surfaces used in appointment side panels and info rows. */
export const schedulerDetailPanelClass = 'rounded-2xl border border-arsm-border bg-arsm-input/80 p-3.5 dark:border-arsm-border-dark dark:bg-arsm-input-dark/65';
export const schedulerDetailRowClass = 'rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 dark:border-arsm-border-dark dark:bg-arsm-input-dark';
export const schedulerAccentTagClass = 'max-w-full truncate rounded-full border border-arsm-accent/25 bg-arsm-accent-wash px-2.5 py-0.5 text-xs font-semibold text-arsm-accent-vivid dark:border-arsm-accent-dark/30 dark:bg-arsm-hover-dark dark:text-arsm-accent';

/** Generic card and border primitives reused by Customers/Admin/Scheduler sections. */
export const roundedOverflowBorderLayoutClass = 'overflow-hidden rounded-2xl border';
export const relativeOverflowBorderLayoutClass = `relative ${roundedOverflowBorderLayoutClass}`;
export const defaultBorderToneClass = 'border-arsm-border dark:border-arsm-border-dark';
export const contentCardFrameClass = `${roundedOverflowBorderLayoutClass} ${defaultBorderToneClass} bg-arsm-card dark:bg-arsm-card-dark`;
export const compactInputSurfaceClass = 'rounded-xl border border-arsm-border bg-arsm-input dark:border-arsm-border-dark dark:bg-arsm-input-dark';

/** Warning feedback tones for inline status/warning messages and chips. */
export const warningFeedbackToneClass = 'border-arsm-warning-border/60 bg-arsm-warning-bg text-arsm-warning-text dark:border-arsm-warning-border-dark/60 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark';
export const warningStatusPillClass = `inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${warningFeedbackToneClass}`;
export const warningNoticeSurfaceClass = `rounded-xl border px-3.5 py-2.5 text-sm ${warningFeedbackToneClass}`;

/** Compact list/detail building blocks for Customers history/details presentation. */
export const compactTwoColumnGridClass = 'grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2';
export const compactHeaderRowClass = 'flex min-w-0 flex-wrap items-center justify-between gap-2';
export const compactDividerLineClass = 'h-px flex-1 bg-arsm-border dark:bg-arsm-border-dark';
export const compactDataSurfaceClass = 'min-w-0 rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 dark:border-arsm-border-dark dark:bg-arsm-input-dark';
export const metadataPillClass = 'inline-block min-w-0 max-w-full truncate rounded-xl border border-arsm-border bg-arsm-toggle-bg px-2.5 py-1 text-xs font-semibold dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark';

/** Shared marketing/placeholder surface classes used by "coming soon" cards. */
export const comingSoonCardClass = 'arsm-coming-soon-card fade-in-up';
export const comingSoonSheenClass = 'arsm-coming-soon-sheen';
export const comingSoonIconBadgeClass = 'arsm-coming-soon-icon-badge';
export const comingSoonDividerClass = 'arsm-coming-soon-divider';

/** Page-shell and section wrappers used across top-level route pages. */
export const cardClass = 'arsm-card-surface';
export const insetSurfaceClass = 'arsm-surface-inset';
export const pageShellClass = 'arsm-page-shell';
export const pageShellNarrowClass = 'arsm-page-shell-narrow';
export const pageShellCompactClass = 'arsm-page-shell-compact';
export const centeredAmbientOrbLayoutClass = 'pointer-events-none absolute left-1/2 top-1/2 z-0 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full';
export const pageHeaderClass = 'arsm-page-header';
export const pageHeaderWithSubtitleClass = 'arsm-page-header-with-subtitle';
export const pageTitleClass = 'arsm-page-title';
export const pageSubtitleClass = 'arsm-page-subtitle';
export const sectionStackClass = 'arsm-section-stack';
export const sectionTitleClass = 'arsm-section-title';
export const actionClusterClass = 'arsm-action-cluster';

/** Sidebar icon alignment helper used by authenticated shell navigation. */
export const sidebarIconSlotClass = 'inline-flex h-10 w-[52px] flex-shrink-0 items-center justify-center';