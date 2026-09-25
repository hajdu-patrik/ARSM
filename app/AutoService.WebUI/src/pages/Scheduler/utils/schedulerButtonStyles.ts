/** Scheduler-owned compact button variants for month filters and mechanic assignment actions. */
import { compactChipActionBaseClass, compactChipDangerButtonClass, compactChipNeutralButtonClass, compactChipPrimaryButtonClass } from '../../../utils/formStyles';

export const schedulerMonthClearFilterButtonClass = `${compactChipNeutralButtonClass} hover:border-arsm-accent/55 dark:hover:border-arsm-accent-dark/55`;
export const schedulerStatusFilterChipButtonClass = compactChipActionBaseClass;
export const schedulerInlineClaimButtonClass = `group min-w-11 ${compactChipPrimaryButtonClass}`;
export const schedulerInlineUnassignButtonClass = `group min-w-11 ${compactChipDangerButtonClass}`;
