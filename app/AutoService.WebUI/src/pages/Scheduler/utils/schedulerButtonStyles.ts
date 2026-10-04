/** Scheduler-owned compact button variants for month filters and mechanic assignment actions. */
import { compactChipDangerButtonClass, compactChipPrimaryButtonClass, compactFilterChipActionBaseClass, compactFilterChipNeutralButtonClass, iconButtonMicroInteractionClass } from '../../../utils/formStyles';

export const schedulerMonthClearFilterButtonClass = `${compactFilterChipNeutralButtonClass} hover:border-arsm-accent/55 dark:hover:border-arsm-accent-dark/55`;
export const schedulerStatusFilterChipButtonClass = compactFilterChipActionBaseClass;
export const schedulerInlineClaimButtonClass = `group min-w-11 ${compactChipPrimaryButtonClass}`;
export const schedulerInlineUnassignButtonClass = `group min-w-11 ${compactChipDangerButtonClass}`;

/** Calendar month-navigation icon button (44x44, bordered, neutral tone); the scheduler calendar is this recipe's only consumer. */
export const schedulerNavIconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-arsm-border bg-arsm-input text-arsm-label hover:bg-arsm-hover hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:border-arsm-border/60 disabled:opacity-50 disabled:hover:bg-arsm-input disabled:hover:text-arsm-label dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark dark:hover:text-arsm-primary-dark dark:disabled:border-arsm-border-dark/60 dark:disabled:hover:bg-arsm-input-dark dark:disabled:hover:text-arsm-label-dark ${iconButtonMicroInteractionClass}`;
