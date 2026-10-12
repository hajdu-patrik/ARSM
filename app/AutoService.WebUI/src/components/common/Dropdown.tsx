/** Shared accessible dropdown (select-only combobox + listbox) that replaces every native select. */
import { ChevronDown } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import {
  dropdownChevronClass,
  dropdownLabelClass,
  dropdownPlaceholderClass,
  dropdownTriggerSizeClasses,
  type DropdownSize,
} from '../../utils/styles/dropdownStyles';
import { defaultIconClass, smallIconClass } from '../../utils/styles/textStyles';
import type { DropdownOption } from './dropdown/dropdown.types';
import { firstEnabledIndex, getDropdownOptionId } from './dropdown/dropdownNavigation';
import { DropdownList } from './dropdown/DropdownList';
import { useDropdownKeyboard } from './dropdown/useDropdownKeyboard';
import { useDropdownPopup } from './dropdown/useDropdownPopup';

export type { DropdownOption } from './dropdown/dropdown.types';

interface DropdownProps {
  readonly value: string;
  readonly options: readonly DropdownOption[];
  readonly onChange: (value: string) => void;
  /** Accessible name: pass `ariaLabel`, `ariaLabelledBy`, or give the trigger an `id` that a visible `<label htmlFor>` targets. */
  readonly id?: string;
  readonly name?: string;
  readonly ariaLabel?: string;
  readonly ariaLabelledBy?: string;
  readonly ariaDescribedBy?: string | undefined;
  readonly ariaInvalid?: boolean | undefined;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly size?: DropdownSize;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

export function Dropdown({
  value,
  options,
  onChange,
  id,
  name,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaInvalid,
  placeholder,
  disabled = false,
  size = 'default',
  className,
  'data-testid': testId,
}: DropdownProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLUListElement>(null);
  const [isOpenRequested, setIsOpenRequested] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [visibleLabelText, setVisibleLabelText] = useState<string | undefined>(undefined);

  const isOpen = isOpenRequested && !disabled;
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex];
  const hasActiveOption = isOpen && options[activeIndex] !== undefined;

  const openList = (index?: number) => {
    const selectedIsEnabled = selectedOption !== undefined && selectedOption.disabled !== true;
    setActiveIndex(index ?? (selectedIsEnabled ? selectedIndex : firstEnabledIndex(options)));
    // A trigger named only by a <label htmlFor> lends that text to the listbox, which the label does not name.
    const labelText = triggerRef.current?.labels[0]?.textContent.trim();
    setVisibleLabelText(labelText === '' ? undefined : labelText);
    setIsOpenRequested(true);
  };

  const closeList = (restoreFocus: boolean) => {
    setIsOpenRequested(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const selectOption = (index: number) => {
    const option = options[index];
    if (option === undefined || option.disabled === true) {
      return;
    }
    closeList(true);
    if (option.value !== value) {
      onChange(option.value);
    }
  };

  useDropdownPopup({ isOpen, activeIndex, triggerRef, popupRef, onDismiss: closeList });
  const { onKeyDown, onKeyUp } = useDropdownKeyboard({
    options,
    isOpen,
    activeIndex,
    selectedIndex,
    onOpen: openList,
    onClose: () => {
      closeList(false);
    },
    onActiveChange: setActiveIndex,
    onSelect: selectOption,
  });

  const iconClass = size === 'compact' ? smallIconClass : defaultIconClass;
  const triggerClassName = [dropdownTriggerSizeClasses[size], className].filter(Boolean).join(' ');
  const chevronClassName = [iconClass, dropdownChevronClass, isOpen ? 'rotate-180' : ''].filter(Boolean).join(' ');
  const labelClassName = [dropdownLabelClass, selectedOption === undefined ? dropdownPlaceholderClass : ''].filter(Boolean).join(' ');

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={hasActiveOption ? getDropdownOptionId(listboxId, activeIndex) : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        data-testid={testId}
        className={triggerClassName}
        onClick={() => {
          if (isOpen) {
            closeList(false);
          } else {
            openList();
          }
        }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <span className={labelClassName}>{selectedOption?.label ?? placeholder ?? ''}</span>
        <ChevronDown aria-hidden="true" className={chevronClassName} />
      </button>
      {name !== undefined && <input type="hidden" name={name} value={value} />}
      {isOpen && (
        <DropdownList
          listboxId={listboxId}
          popupRef={popupRef}
          options={options}
          selectedIndex={selectedIndex}
          activeIndex={activeIndex}
          ariaLabel={ariaLabel ?? (ariaLabelledBy === undefined ? visibleLabelText : undefined)}
          ariaLabelledBy={ariaLabelledBy}
          testId={testId}
          size={size}
          onSelect={selectOption}
          onHover={setActiveIndex}
        />
      )}
    </>
  );
}
