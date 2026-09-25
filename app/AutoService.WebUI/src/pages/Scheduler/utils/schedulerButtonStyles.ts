/** Scheduler-owned compact button styles for month filters and mechanic assignment actions. */
import { compactChipActionBaseClass } from '../../../utils/formStyles';

export const schedulerMonthSortButtonClass = `${compactChipActionBaseClass} border-arsm-border bg-arsm-card text-arsm-label hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark`;
export const schedulerMonthClearFilterButtonClass = `${schedulerMonthSortButtonClass} hover:border-arsm-accent/55 dark:hover:border-arsm-accent-dark/55`;
export const schedulerStatusFilterChipButtonClass = compactChipActionBaseClass;
export const schedulerInlineClaimButtonClass = `group min-w-11 ${compactChipActionBaseClass} border-arsm-accent/70 bg-arsm-accent-subtle text-arsm-primary hover:border-arsm-accent hover:bg-arsm-accent-wash dark:border-arsm-accent-dark/70 dark:bg-arsm-accent-dark/25 dark:text-arsm-primary-dark dark:hover:border-arsm-accent-dark dark:hover:bg-arsm-accent-dark/35`;
export const schedulerInlineUnassignButtonClass = `group min-w-11 ${compactChipActionBaseClass} border-arsm-error-border/75 bg-arsm-error-bg text-arsm-error-text hover:border-arsm-error-text/40 hover:bg-arsm-error-soft dark:border-arsm-error-dark/75 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:border-arsm-error-text-light/35 dark:hover:bg-arsm-error-bg-dark/85`;
