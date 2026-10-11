/** Shared typography, label, icon, and spinner style primitives. */

/** Secondary copy tones for helper text, metadata, and muted body content. */
export const mutedBodyTextClass = 'text-sm text-ui-label';
export const mutedSecondaryTextClass = 'text-sm text-ui-muted';
export const mutedDarkCardToneClass = 'text-ui-muted dark:bg-arsm-card-dark';
export const mutedMetaTextClass = 'text-xs text-ui-muted';

/** Primary value and heading tones used in detail cards and panel titles. */
export const compactPrimaryValueTextClass = 'text-sm text-ui-text';
export const sectionHeadingToneClass = 'font-semibold text-ui-text';
export const baseSectionHeadingTextClass = `text-base ${sectionHeadingToneClass}`;
export const compactSectionHeadingTextClass = `text-sm ${sectionHeadingToneClass}`;

/** List item text hierarchy used in compact rows (customers, vehicles, scheduler lists). */
export const compactListPrimaryTextClass = 'truncate text-sm font-medium text-ui-text';
export const compactListSecondaryTextClass = 'truncate text-xs text-ui-label';
/** Same typography and colors as the two list classes above, but long names and emails wrap instead of truncating. */
export const compactListPrimaryWrapTextClass = 'min-w-0 [overflow-wrap:anywhere] text-sm font-medium text-ui-text';
export const compactListSecondaryWrapTextClass = 'min-w-0 [overflow-wrap:anywhere] text-xs text-ui-label';
export const compactItemTitleTextClass = 'min-w-0 truncate text-sm font-semibold text-ui-text';
/** Same typography and colors as `compactItemTitleTextClass`, but wraps (long words break) and clamps at 2 lines instead of truncating. */
export const compactItemTitleClampTextClass = 'min-w-0 line-clamp-2 [overflow-wrap:anywhere] text-sm font-semibold text-ui-text';
/** Large standalone headline (auth card title, headline figures), one step up on wider screens. */
export const displayHeadingTextClass = 'text-xl font-semibold text-ui-text sm:text-2xl';
export const inlinePrimaryLabelTextClass = 'font-semibold text-ui-text';
export const uppercaseMetaLabelTextClass = 'text-xs font-medium uppercase tracking-wide text-ui-muted';
export const inlineStatusTitleRowClass = 'flex min-w-0 items-center gap-2 font-semibold';
export const inlineSectionTitleClass = 'inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-ui-text';
/** Icon size scale: small for compact chips and 44px row icon actions, default for buttons and titles, large for icon-only toggles. */
export const smallIconClass = 'h-3.5 w-3.5 shrink-0';
export const defaultIconClass = 'h-4 w-4 shrink-0';
export const largeIconClass = 'h-5 w-5 shrink-0';
export const mutedSectionIconClass = `${largeIconClass} text-ui-muted`;

/** Shared loading spinner typography used in reusable async-state surfaces. */
export const loadingSpinnerClass = 'animate-spin motion-reduce:animate-none rounded-full border-[3px] border-ui-accent/30 border-t-ui-accent';

/** Monospaced identifier text (plates, codes) shared by catalog and quote row components. */
export const monoIdentifierTextClass = 'min-w-0 truncate font-mono text-sm text-ui-label';

/** Right-aligned tabular figures for money, quantities and percentages in list rows. */
export const numericValueTextClass = 'min-w-0 truncate text-right text-sm tabular-nums text-ui-text';
/** Same typography as `numericValueTextClass`, but wraps instead of truncating so a figure is never ellipsized. */
export const numericValueWrapTextClass = 'min-w-0 [overflow-wrap:anywhere] text-right text-sm tabular-nums text-ui-text';
export const numericMutedValueTextClass = 'min-w-0 truncate text-right text-sm tabular-nums text-ui-label';