/** Scheduler-owned compact button variants for month filters (28px at every width) and mechanic assignment actions. */
import { compactChipCoreClass, compactChipDangerButtonClass, compactChipNeutralToneClass, compactChipPrimaryButtonClass } from '../../../utils/formStyles';

export const schedulerSortButtonClass = `${compactChipCoreClass} ${compactChipNeutralToneClass}`;
export const schedulerMonthClearFilterButtonClass = `${schedulerSortButtonClass} hover:border-ui-accent/55`;
export const schedulerStatusFilterChipButtonClass = compactChipCoreClass;
export const schedulerInlineClaimButtonClass = `group min-w-11 ${compactChipPrimaryButtonClass}`;
export const schedulerInlineUnassignButtonClass = `group min-w-11 ${compactChipDangerButtonClass}`;
/** Chip label that wraps and centers instead of ellipsizing (the chip base sets `whitespace-nowrap` on the button). */
export const schedulerChipLabelClass = 'min-w-0 whitespace-normal text-center';
