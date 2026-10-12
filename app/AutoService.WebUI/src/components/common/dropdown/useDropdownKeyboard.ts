/** Trigger keyboard handling of the Dropdown: arrows, Home/End, Enter/Space, Tab and type-ahead by label. */
import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { DropdownOption } from './dropdown.types';
import { findTypeAheadIndex, firstEnabledIndex, lastEnabledIndex, stepEnabledIndex } from './dropdownNavigation';

const TYPE_AHEAD_RESET_MS = 700;

interface UseDropdownKeyboardOptions {
  readonly options: readonly DropdownOption[];
  readonly isOpen: boolean;
  readonly activeIndex: number;
  readonly selectedIndex: number;
  readonly onOpen: (index?: number) => void;
  readonly onClose: () => void;
  readonly onActiveChange: (index: number) => void;
  readonly onSelect: (index: number) => void;
}

interface DropdownKeyboardHandlers {
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onKeyUp: (event: KeyboardEvent<HTMLElement>) => void;
}

export function useDropdownKeyboard({
  options,
  isOpen,
  activeIndex,
  selectedIndex,
  onOpen,
  onClose,
  onActiveChange,
  onSelect,
}: UseDropdownKeyboardOptions): DropdownKeyboardHandlers {
  const typedRef = useRef('');
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
  }, []);

  const moveTo = (index: number) => {
    if (isOpen) {
      onActiveChange(index);
    } else {
      onOpen(index);
    }
  };

  const resetTypeAhead = () => {
    window.clearTimeout(timerRef.current);
    typedRef.current = '';
  };

  const typeAhead = (char: string) => {
    window.clearTimeout(timerRef.current);
    typedRef.current += char;
    timerRef.current = window.setTimeout(() => {
      typedRef.current = '';
    }, TYPE_AHEAD_RESET_MS);

    const index = findTypeAheadIndex(options, typedRef.current, isOpen ? activeIndex : selectedIndex);
    if (index >= 0) {
      moveTo(index);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.key === ' ' && typedRef.current !== '') {
      event.preventDefault();
      typeAhead(' ');
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          onActiveChange(stepEnabledIndex(options, activeIndex, event.key === 'ArrowDown' ? 1 : -1));
        } else {
          onOpen();
        }
        break;
      case 'Home':
        event.preventDefault();
        moveTo(firstEnabledIndex(options));
        break;
      case 'End':
        event.preventDefault();
        moveTo(lastEnabledIndex(options));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        resetTypeAhead();
        if (isOpen) {
          onSelect(activeIndex);
        } else {
          onOpen();
        }
        break;
      case 'Escape':
        resetTypeAhead();
        break;
      case 'Tab':
        resetTypeAhead();
        if (isOpen) {
          onClose();
        }
        break;
      default:
        if (event.key.length === 1) {
          typeAhead(event.key);
        }
    }
  };

  // A released Space would click the button again (Firefox), so its default is cancelled too.
  const onKeyUp = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === ' ') {
      event.preventDefault();
    }
  };

  return { onKeyDown, onKeyUp };
}
