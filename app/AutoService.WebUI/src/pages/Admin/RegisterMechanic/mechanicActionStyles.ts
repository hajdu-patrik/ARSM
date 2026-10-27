import { focusVisibleOutlineClass, iconButtonMicroInteractionClass, iconDangerToneClass, iconWarningToneClass } from '../../../utils/formStyles';

/** 44px (touch-size) bordered icon button core for the roster card corner; the tone colors come from the shared icon button tones. */
const mechanicIconButtonBaseClass = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${focusVisibleOutlineClass} disabled:cursor-not-allowed disabled:opacity-60 disabled:border-ui-border disabled:bg-ui-toggle disabled:text-ui-muted disabled:hover:bg-ui-toggle disabled:hover:text-ui-muted ${iconButtonMicroInteractionClass}`;

export const mechanicWarningIconButtonClass = `${mechanicIconButtonBaseClass} ${iconWarningToneClass}`;
export const mechanicDangerIconButtonClass = `${mechanicIconButtonBaseClass} ${iconDangerToneClass}`;
