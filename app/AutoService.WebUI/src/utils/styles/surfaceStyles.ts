/** Shared surface, content, card, panel, and layout style primitives. */
import { mutedDarkCardToneClass } from './textStyles';

/** Shared layout wrappers for grouped control rows and modal/footer action zones. */
export const controlRowClass = 'arsm-control-row';
export const controlPanelFooterClass = 'arsm-modal-footer';
export const equalWidthControlGroupClass = 'arsm-equal-control-group';

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

/** Shared outer frame for popup, toast, and live notification surfaces. */
export const feedbackFrameClass = 'outline outline-1 outline-offset-1 outline-arsm-primary/25 dark:outline-purple-900/80';

/** Warning feedback tones for inline status/warning messages and chips. */
export const warningFeedbackToneClass = 'border-arsm-warning-border/60 bg-arsm-warning-bg text-arsm-warning-text dark:border-arsm-warning-border-dark/60 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark';
export const warningStatusPillClass = `inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${warningFeedbackToneClass}`;
export const successNoticeSurfaceClass = `rounded-xl border px-3.5 py-2.5 text-sm ${feedbackFrameClass} border-arsm-success-border/60 bg-arsm-success-bg text-arsm-success-text dark:border-arsm-success-border-dark/60 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark`;
export const warningNoticeSurfaceClass = `rounded-xl border px-3.5 py-2.5 text-sm ${feedbackFrameClass} ${warningFeedbackToneClass}`;

/** Compact list/detail building blocks for Customers history/details presentation. */
export const compactTwoColumnGridClass = 'grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2';
export const compactHeaderRowClass = 'flex min-w-0 flex-wrap items-center justify-between gap-2';
export const compactDividerLineClass = 'h-px flex-1 bg-arsm-border dark:bg-arsm-border-dark';
export const compactDataSurfaceClass = 'min-w-0 rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 dark:border-arsm-border-dark dark:bg-arsm-input-dark';
export const metadataPillClass = 'inline-block min-w-0 max-w-full truncate rounded-xl border border-arsm-border bg-arsm-toggle-bg px-2.5 py-1 text-xs font-semibold dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark';

/** Page-shell and section wrappers used across top-level route pages. */
export const cardClass = 'arsm-card-surface';
export const insetSurfaceClass = 'arsm-surface-inset';
export const pageShellClass = 'arsm-page-shell';
export const pageShellNarrowClass = 'arsm-page-shell-narrow';
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

/** Dashed empty-state box shown when a list/search has no results. */
export const emptyStateBoxClass = `rounded-2xl border border-dashed border-arsm-border bg-arsm-input px-4 py-12 text-center text-sm ${mutedDarkCardToneClass}`;

/** Container-query thresholds at which an aligned data list switches from labeled tiles to the column table. */
export type DataListBreakpoint = 'lg' | '3xl' | '4xl';

export interface DataListBreakpointClasses {
  /** Grid root: the feature adds its own `@…:grid-cols-[…]` template next to this. */
  readonly root: string;
  /** Spans every track and inherits them, so header, body and rows share one column model. */
  readonly subgrid: string;
  /** Vertical centering for a data row. */
  readonly rowAlign: string;
  /** Full-width child of the body (for example an inline editor) once the table is active. */
  readonly fullSpan: string;
  /** Wrapper of the desktop cells: dissolves so the cells become subgrid items. */
  readonly desktopCells: string;
  /** Labeled-tile block shown below the threshold. */
  readonly mobileBlock: string;
}

export const dataListBreakpointClasses: Record<DataListBreakpoint, DataListBreakpointClasses> = {
  lg:    { root: '@lg:grid @lg:gap-x-3',   subgrid: '@lg:col-span-full @lg:grid @lg:grid-cols-subgrid',    rowAlign: '@lg:items-center',  fullSpan: '@lg:col-span-full',  desktopCells: 'hidden @lg:contents',  mobileBlock: '@lg:hidden' },
  '3xl': { root: '@3xl:grid @3xl:gap-x-3', subgrid: '@3xl:col-span-full @3xl:grid @3xl:grid-cols-subgrid', rowAlign: '@3xl:items-center', fullSpan: '@3xl:col-span-full', desktopCells: 'hidden @3xl:contents', mobileBlock: '@3xl:hidden' },
  '4xl': { root: '@4xl:grid @4xl:gap-x-3', subgrid: '@4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid', rowAlign: '@4xl:items-center', fullSpan: '@4xl:col-span-full', desktopCells: 'hidden @4xl:contents', mobileBlock: '@4xl:hidden' },
};