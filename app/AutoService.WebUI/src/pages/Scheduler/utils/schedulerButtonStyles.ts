/** Scheduler-owned compact button variants for month filters (28px at every width) and mechanic assignment actions. */
import { compactChipCoreClass, compactChipDangerButtonClass, compactChipNeutralToneClass, compactChipPrimaryButtonClass, focusVisibleOutlineClass, iconButtonMicroInteractionClass } from '../../../utils/formStyles';

export const schedulerSortButtonClass = `${compactChipCoreClass} ${compactChipNeutralToneClass}`;
export const schedulerMonthClearFilterButtonClass = `${schedulerSortButtonClass} hover:border-ui-accent/55`;
export const schedulerStatusFilterChipButtonClass = compactChipCoreClass;
export const schedulerInlineClaimButtonClass = `group min-w-11 ${compactChipPrimaryButtonClass}`;
export const schedulerInlineUnassignButtonClass = `group min-w-11 ${compactChipDangerButtonClass}`;
/** Chip label that wraps and centers instead of ellipsizing (the chip base sets `whitespace-nowrap` on the button). */
export const schedulerChipLabelClass = 'min-w-0 whitespace-normal text-center';

/** Calendar month-navigation icon button (44x44, bordered, neutral tone); the scheduler calendar is this recipe's only consumer. */
export const schedulerNavIconButtonClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ui-border bg-ui-input text-ui-label hover:bg-ui-hover hover:text-ui-text ${focusVisibleOutlineClass} disabled:cursor-not-allowed disabled:border-ui-border/60 disabled:opacity-50 disabled:hover:bg-ui-input disabled:hover:text-ui-label ${iconButtonMicroInteractionClass}`;
