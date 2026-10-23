/** Shared surface, content, card, panel, and layout style primitives. */
import { mutedDarkCardToneClass } from './textStyles';
import { toneFeedbackClasses } from './toneStyles';

/** Shared layout wrappers for grouped control rows and modal/footer action zones. */
export const controlRowClass = 'arsm-control-row';
export const controlPanelFooterClass = 'arsm-modal-footer';
export const equalWidthControlGroupClass = 'arsm-equal-control-group';

/** Keyboard focus indicator: a 2px outline 2px off the edge in the focus color, so focus never shifts the layout.
 * `arsm-focus-outline` (components.css) rests the outline color on it, so the transition does not fade it in from currentcolor. */
export const focusVisibleOutlineClass = 'arsm-focus-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus';
/** Inset (-2px) variant for full-surface overlay buttons, whose outer outline a clipping ancestor or a neighbour row would hide. */
export const insetFocusVisibleOutlineClass = 'arsm-focus-outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ui-focus';

/** Scheduler details surfaces used in appointment side panels and info rows. */
export const schedulerDetailPanelClass = 'rounded-2xl border border-ui-border bg-arsm-input/80 p-3.5 dark:bg-arsm-input-dark/65';
export const schedulerDetailRowClass = 'rounded-xl border border-ui-border bg-ui-input px-3 py-2';

/** Generic card and border primitives reused by Customers/Admin/Scheduler sections. */
const roundedOverflowBorderLayoutClass = 'overflow-hidden rounded-2xl border';
export const relativeOverflowBorderLayoutClass = `relative ${roundedOverflowBorderLayoutClass}`;
export const defaultBorderToneClass = 'border-ui-border';
export const contentCardFrameClass = `${roundedOverflowBorderLayoutClass} ${defaultBorderToneClass} bg-ui-card`;
export const compactInputSurfaceClass = 'rounded-xl border border-ui-border bg-ui-input';

/** Shared outer frame for popup, toast, and live notification surfaces. */
export const feedbackFrameClass = 'outline outline-1 outline-offset-1 outline-arsm-primary/25 dark:outline-purple-900/80';

/** Inline notice banners: the shared notice shell in a feedback tone. */
const noticeSurfaceBaseClass = `rounded-xl border px-3.5 py-2.5 text-sm ${feedbackFrameClass}`;
export const successNoticeSurfaceClass = `${noticeSurfaceBaseClass} ${toneFeedbackClasses.success}`;
export const warningNoticeSurfaceClass = `${noticeSurfaceBaseClass} ${toneFeedbackClasses.warning}`;

/** Compact list/detail building blocks for Customers history/details presentation. */
export const compactTwoColumnGridClass = 'grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2';
/** Two columns at every width, 320px included, with the same gap as `compactTwoColumnGridClass`. */
export const compactTwoColumnFixedGridClass = 'grid min-w-0 grid-cols-2 gap-2';
export const compactHeaderRowClass = 'flex min-w-0 flex-wrap items-center justify-between gap-2';
export const compactDividerLineClass = 'h-px flex-1 bg-ui-border';
export const compactDataSurfaceClass = 'min-w-0 rounded-xl border border-ui-border bg-ui-input px-3 py-2';
export const metadataPillClass = 'inline-block min-w-0 max-w-full truncate rounded-xl border border-ui-border bg-ui-toggle px-2.5 py-1 text-xs font-semibold';
/** Same look as `metadataPillClass`, but long values wrap instead of truncating. */
export const metadataPillWrapClass = 'inline-block min-w-0 max-w-full [overflow-wrap:anywhere] rounded-xl border border-ui-border bg-ui-toggle px-2.5 py-1 text-xs font-semibold';

/** Wrapping toolbar row: items share a line while there is room, otherwise the next one wraps below. */
export const toolbarRowLayoutClass = 'flex min-w-0 flex-wrap items-center justify-between gap-3';
/** Toolbar search group: 18rem is its minimum before it wraps to a full row; grow 999 (against 1) takes a shared line's free space. */
export const toolbarSearchFieldClass = 'grow-[999] basis-72';
/** Toolbar action group: buttons keep their full label width and wrap among themselves, right-aligned.
 * `*:basis-auto` stops a `flex-1` on a button from collapsing its basis to zero. */
export const toolbarActionsWrapperClass = 'flex min-w-0 max-w-full grow flex-wrap items-center justify-end gap-2 *:basis-auto';
/** Toolbar button inside `toolbarActionsWrapperClass`: fills its row below sm, keeps its own width from sm up. */
export const toolbarActionGrowClass = 'grow sm:grow-0';

/** Compact row header layout shared by vehicle, catalog, and quote row/card components. */
export const compactRowHeaderClass = 'flex min-w-0 items-start justify-between gap-2';
/** Compact row actions cluster paired with `compactRowHeaderClass`, wrapping under very narrow widths. */
export const compactRowActionsClusterClass = 'flex shrink-0 items-center gap-1 max-[350px]:flex-wrap max-[350px]:justify-end';

/** Centered loading wrapper shared by list/calendar sections while their async data resolves. */
export const centeredLoadingWrapperClass = 'flex min-w-0 items-center justify-center py-12';

/** Shared hover/focus micro-motion for list/nav rows (sidebar nav rows, admin list rows). */
export const rowHoverMotionClass = 'transition-[background-color,border-color,color,transform] duration-200 ease-out motion-reduce:hover:translate-y-0 motion-reduce:transition-colors';

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
export const emptyStateBoxClass = `rounded-2xl border border-dashed border-ui-border bg-arsm-input px-4 py-12 text-center text-sm ${mutedDarkCardToneClass}`;