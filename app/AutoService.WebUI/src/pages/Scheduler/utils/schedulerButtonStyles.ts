/** Scheduler-owned compact button variants for month filters (28px from lg, 44px touch height below it) and mechanic assignment actions. */
import { compactChipDangerButtonClass, compactChipNeutralToneClass, compactChipPrimaryButtonClass, compactFilterChipActionBaseClass } from '../../../utils/formStyles';

export const schedulerSortButtonClass = `${compactFilterChipActionBaseClass} ${compactChipNeutralToneClass}`;
export const schedulerMonthClearFilterButtonClass = `${schedulerSortButtonClass} hover:border-ui-accent/55`;
export const schedulerStatusFilterChipButtonClass = compactFilterChipActionBaseClass;
export const schedulerInlineClaimButtonClass = `group min-w-11 ${compactChipPrimaryButtonClass}`;
export const schedulerInlineUnassignButtonClass = `group min-w-11 ${compactChipDangerButtonClass}`;
/** Chip label that wraps and centers instead of ellipsizing (the chip base sets `whitespace-nowrap` on the button). */
export const schedulerChipLabelClass = 'min-w-0 whitespace-normal text-center';
