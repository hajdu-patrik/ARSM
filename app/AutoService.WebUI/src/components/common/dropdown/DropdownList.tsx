/** Listbox popup of the Dropdown, portaled to the body so no overflow-hidden ancestor or modal clips it. */
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { dropdownPopupClass, type DropdownSize } from '../../../utils/styles/dropdownStyles';
import type { DropdownOption } from './dropdown.types';
import { getDropdownOptionId } from './dropdownNavigation';
import { DropdownOptionRow } from './DropdownOptionRow';

interface DropdownListProps {
  readonly listboxId: string;
  readonly popupRef: RefObject<HTMLUListElement | null>;
  readonly options: readonly DropdownOption[];
  readonly selectedIndex: number;
  readonly activeIndex: number;
  readonly ariaLabel: string | undefined;
  readonly ariaLabelledBy: string | undefined;
  readonly testId: string | undefined;
  readonly size: DropdownSize;
  readonly onSelect: (index: number) => void;
  readonly onHover: (index: number) => void;
}

export function DropdownList({
  listboxId,
  popupRef,
  options,
  selectedIndex,
  activeIndex,
  ariaLabel,
  ariaLabelledBy,
  testId,
  size,
  onSelect,
  onHover,
}: DropdownListProps) {
  // Mouse down stays off the list so the trigger keeps focus (aria-activedescendant pattern).
  return createPortal(
    <ul
      ref={popupRef}
      id={listboxId}
      role="listbox"
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      data-testid={testId === undefined ? undefined : `${testId}-listbox`}
      className={dropdownPopupClass}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    >
      {options.map((option, index) => (
        <DropdownOptionRow
          key={option.value}
          id={getDropdownOptionId(listboxId, index)}
          option={option}
          index={index}
          isSelected={index === selectedIndex}
          isActive={index === activeIndex}
          testId={testId}
          size={size}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </ul>,
    document.body,
  );
}
