/** Shared custom dropdown primitives: the closed trigger reuses the native select geometry, the popup and options are new. */
import { compactSelectFullClass, filterSelectCompactSlimSurfaceClass, filterSelectCompactSurfaceClass, inputClass, intakeInputClass } from './fieldStyles';

const dropdownTriggerLayoutClass = 'flex items-center justify-between gap-2 text-left';
const dropdownCompactDisabledClass = 'disabled:cursor-not-allowed disabled:opacity-50';

/** Closed-state trigger per size: `default` is `compactSelectFullClass`, `compact` the toolbar select, `compactSlim` the same at 28px on every width, `field` the `inputClass`, `intake` the `intakeInputClass`. */
export const dropdownTriggerSizeClasses = {
  default: `${compactSelectFullClass} ${dropdownTriggerLayoutClass}`,
  compact: `${filterSelectCompactSurfaceClass} ${dropdownTriggerLayoutClass} ${dropdownCompactDisabledClass}`,
  compactSlim: `${filterSelectCompactSlimSurfaceClass} ${dropdownTriggerLayoutClass} ${dropdownCompactDisabledClass}`,
  field: `${inputClass} min-w-0 max-w-full ${dropdownTriggerLayoutClass}`,
  intake: `${intakeInputClass} ${dropdownTriggerLayoutClass}`,
} as const;

export type DropdownSize = keyof typeof dropdownTriggerSizeClasses;

export const dropdownLabelClass = 'min-w-0 flex-1 truncate';

export const dropdownPlaceholderClass = 'text-ui-placeholder';

export const dropdownChevronClass = 'shrink-0 transition-transform duration-200 motion-reduce:transition-none';

/** Fixed popup; top/left/width/max-height are written through the CSSOM (CSP forbids the style prop). */
export const dropdownPopupClass = 'fixed z-[115] m-0 max-h-72 list-none overflow-y-auto overscroll-contain rounded-xl border border-ui-field-border bg-ui-input py-1 text-ui-text';

const dropdownOptionBaseClass = 'flex min-h-11 w-full items-center justify-between gap-2 py-2 text-left text-ui-text';

/** Option text per size: `compact` and `compactSlim` share the `default` row;`field` and `intake` follow their input geometry. */
const dropdownOptionTextClasses = {
  default: 'px-3 text-sm',
  field: 'px-4 text-ui-field',
  intake: 'px-4 text-sm',
} as const;

interface DropdownOptionState {
  readonly isActive: boolean;
  readonly isSelected: boolean;
  readonly isDisabled: boolean;
  readonly size?: DropdownSize;
}

/** Option row: the active one gets the toggle fill, the selected one is semibold with a check mark. */
export function getDropdownOptionClass({ isActive, isSelected, isDisabled, size = 'default' }: DropdownOptionState): string {
  const stateClasses = [
    dropdownOptionTextClasses[size === 'compact' || size === 'compactSlim' ? 'default' : size],
    isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    isActive && !isDisabled ? 'bg-ui-toggle' : '',
    isSelected ? 'font-semibold' : '',
  ];
  return [dropdownOptionBaseClass, ...stateClasses].filter(Boolean).join(' ');
}

export const dropdownOptionLabelClass = 'min-w-0 [overflow-wrap:anywhere]';

export const dropdownOptionCheckClass = 'h-4 w-4 shrink-0 text-ui-accent';
