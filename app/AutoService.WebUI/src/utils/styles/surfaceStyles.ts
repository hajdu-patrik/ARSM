/** Shared surface, content, card, panel, and layout style primitives. */
import { mutedDarkCardToneClass } from './textStyles';
import { toneFeedbackClasses } from './toneStyles';

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

/** Inline notice banners: the shared notice shell in a feedback tone. */
const noticeSurfaceBaseClass = `rounded-xl border px-3.5 py-2.5 text-sm ${feedbackFrameClass}`;
export const successNoticeSurfaceClass = `${noticeSurfaceBaseClass} ${toneFeedbackClasses.success}`;
export const warningNoticeSurfaceClass = `${noticeSurfaceBaseClass} ${toneFeedbackClasses.warning}`;

/** Compact list/detail building blocks for Customers history/details presentation. */
export const compactTwoColumnGridClass = 'grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2';
export const compactHeaderRowClass = 'flex min-w-0 flex-wrap items-center justify-between gap-2';
export const compactDividerLineClass = 'h-px flex-1 bg-arsm-border dark:bg-arsm-border-dark';
export const compactDataSurfaceClass = 'min-w-0 rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 dark:border-arsm-border-dark dark:bg-arsm-input-dark';
export const metadataPillClass = 'inline-block min-w-0 max-w-full truncate rounded-xl border border-arsm-border bg-arsm-toggle-bg px-2.5 py-1 text-xs font-semibold dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark';

/** Toolbar row layout shared by Customers/Inventory/Quotes toolbars and the scheduler quick-intake section. */
export const toolbarRowLayoutClass = 'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between';
/** Wrapper for a toolbar's action controls, allowed to wrap on narrow widths before the toolbar itself stacks. */
export const toolbarActionsWrapperClass = 'flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap';

/** Compact row header layout shared by vehicle, catalog, and quote row/card components. */
export const compactRowHeaderClass = 'flex min-w-0 items-start justify-between gap-2';
/** Compact row actions cluster paired with `compactRowHeaderClass`, wrapping under very narrow widths. */
export const compactRowActionsClusterClass = 'flex shrink-0 items-center gap-1 max-[350px]:flex-wrap max-[350px]:justify-end';

/** Centered loading wrapper shared by list/calendar sections while their async data resolves. */
export const centeredLoadingWrapperClass = 'flex min-w-0 items-center justify-center py-12';

/** Shared hover/focus micro-motion for list/nav rows (sidebar nav rows, admin list rows). */
export const rowHoverMotionClass = 'transition-[background-color,border-color,color,transform] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-colors';

/** Inline wrapper for wrapping chip/action clusters without a justify-between split (compare `compactHeaderRowClass`). */
export const compactInlineClusterClass = 'flex min-w-0 flex-wrap items-center gap-2';
/** Stacked-to-row layout for compact header/summary strips (gap-2; compare the gap-3 `toolbarRowLayoutClass`). */
export const compactStackedRowClass = 'flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between';

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