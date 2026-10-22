import { Check } from 'lucide-react';
import { dropdownOptionCheckClass, dropdownOptionLabelClass, getDropdownOptionClass, type DropdownSize } from '../../../utils/styles/dropdownStyles';
import type { DropdownOption } from './dropdown.types';

interface DropdownOptionRowProps {
  readonly id: string;
  readonly option: DropdownOption;
  readonly index: number;
  readonly isSelected: boolean;
  readonly isActive: boolean;
  readonly testId: string | undefined;
  readonly size: DropdownSize;
  readonly onSelect: (index: number) => void;
  readonly onHover: (index: number) => void;
}

export function DropdownOptionRow({ id, option, index, isSelected, isActive, testId, size, onSelect, onHover }: DropdownOptionRowProps) {
  const isDisabled = option.disabled === true;

  return (
    // Focus stays on the trigger (aria-activedescendant), whose keydown handler selects; the row only takes pointer clicks.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <li
      id={id}
      role="option"
      aria-selected={isSelected}
      aria-disabled={isDisabled || undefined}
      data-testid={testId === undefined ? undefined : `${testId}-option-${option.value}`}
      className={getDropdownOptionClass({ isActive, isSelected, isDisabled, size })}
      onClick={() => {
        onSelect(index);
      }}
      onPointerMove={() => {
        if (!isActive && !isDisabled) {
          onHover(index);
        }
      }}
    >
      <span className={dropdownOptionLabelClass}>{option.label}</span>
      {isSelected && <Check aria-hidden="true" className={dropdownOptionCheckClass} />}
    </li>
  );
}
