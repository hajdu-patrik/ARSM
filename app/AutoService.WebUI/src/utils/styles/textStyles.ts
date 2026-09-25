/** Shared typography, label, icon, and spinner style primitives. */

/** Secondary copy tones for helper text, metadata, and muted body content. */
export const mutedBodyTextClass = 'text-sm text-arsm-label dark:text-arsm-label-dark';
export const mutedSecondaryTextClass = 'text-sm text-arsm-muted dark:text-arsm-muted-dark';
export const mutedDarkCardToneClass = 'text-arsm-muted dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-muted-dark';
export const mutedMetaTextClass = 'text-xs text-arsm-muted dark:text-arsm-muted-dark';

/** Primary value and heading tones used in detail cards and panel titles. */
export const compactPrimaryValueTextClass = 'text-sm text-arsm-primary dark:text-arsm-primary-dark';
export const sectionHeadingToneClass = 'font-semibold text-arsm-primary dark:text-arsm-primary-dark';
export const baseSectionHeadingTextClass = `text-base ${sectionHeadingToneClass}`;
export const compactSectionHeadingTextClass = `text-sm ${sectionHeadingToneClass}`;

/** List item text hierarchy used in compact rows (customers, vehicles, scheduler lists). */
export const compactListPrimaryTextClass = 'truncate text-sm font-medium text-arsm-primary dark:text-arsm-primary-dark';
export const compactListSecondaryTextClass = 'truncate text-xs text-arsm-label dark:text-arsm-label-dark';
export const compactItemTitleTextClass = 'min-w-0 truncate text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark';
/** Large standalone headline (auth card title, headline figures), one step up on wider screens. */
export const displayHeadingTextClass = 'text-xl font-semibold text-arsm-primary sm:text-2xl dark:text-arsm-primary-dark';
export const inlinePrimaryLabelTextClass = 'font-semibold text-arsm-primary dark:text-arsm-primary-dark';
export const uppercaseMetaLabelTextClass = 'text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark';
export const inlineStatusTitleRowClass = 'flex min-w-0 items-center gap-2 font-semibold';
export const inlineSectionTitleClass = 'inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark';
/** Icon size scale: small for compact chips and 44px row icon actions, default for buttons and titles, large for icon-only toggles. */
export const smallIconClass = 'h-3.5 w-3.5 shrink-0';
export const defaultIconClass = 'h-4 w-4 shrink-0';
export const largeIconClass = 'h-5 w-5 shrink-0';
export const mutedSectionIconClass = `${largeIconClass} text-arsm-muted dark:text-arsm-muted-dark`;

/** Shared loading spinner typography used in reusable async-state surfaces. */
export const loadingSpinnerClass = 'animate-spin motion-reduce:animate-none rounded-full border-[3px] border-arsm-accent/30 border-t-arsm-accent dark:border-arsm-accent-dark/30 dark:border-t-arsm-accent-dark';

/** Monospaced identifier text (plates, codes) shared by catalog and quote row components. */
export const monoIdentifierTextClass = 'min-w-0 truncate font-mono text-sm text-arsm-label dark:text-arsm-label-dark';

/** Right-aligned tabular figures for money, quantities and percentages in list rows. */
export const numericValueTextClass = 'min-w-0 truncate text-right text-sm tabular-nums text-arsm-primary dark:text-arsm-primary-dark';
export const numericMutedValueTextClass = 'min-w-0 truncate text-right text-sm tabular-nums text-arsm-label dark:text-arsm-label-dark';