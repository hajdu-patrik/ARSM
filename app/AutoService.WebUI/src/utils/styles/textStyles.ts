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
export const inlinePrimaryLabelTextClass = 'font-semibold text-arsm-primary dark:text-arsm-primary-dark';
export const uppercaseMetaLabelTextClass = 'text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark';
export const inlineStatusTitleRowClass = 'flex min-w-0 items-center gap-2 font-semibold';
export const inlineSectionTitleClass = 'inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark';
export const mutedSectionIconClass = 'h-5 w-5 shrink-0 text-arsm-muted dark:text-arsm-muted-dark';

/** Shared loading + placeholder icon typography used in reusable "coming soon" surfaces. */
export const loadingSpinnerClass = 'animate-spin motion-reduce:animate-none rounded-full border-[3px] border-arsm-accent/30 border-t-arsm-accent dark:border-arsm-accent-dark/30 dark:border-t-arsm-accent-dark';
export const comingSoonIconClass = 'h-9 w-9 text-arsm-accent-vivid dark:text-arsm-accent';
export const comingSoonTitleClass = 'mb-2 text-xl font-semibold text-arsm-primary dark:text-arsm-primary-dark';
export const comingSoonDescriptionClass = 'mx-auto max-w-sm text-sm leading-relaxed text-arsm-muted dark:text-arsm-muted-dark';