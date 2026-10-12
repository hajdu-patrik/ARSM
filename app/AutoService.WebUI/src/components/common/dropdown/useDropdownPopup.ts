/** Popup lifecycle of the Dropdown: placement, outside-pointer and Escape dismissal, active option scroll. */
import { useEffect, useEffectEvent, useLayoutEffect, type RefObject } from 'react';
import { placeDropdownPopup } from './dropdownPlacement';

interface UseDropdownPopupOptions {
  readonly isOpen: boolean;
  readonly activeIndex: number;
  readonly triggerRef: RefObject<HTMLElement | null>;
  readonly popupRef: RefObject<HTMLElement | null>;
  readonly onDismiss: (restoreFocus: boolean) => void;
}

export function useDropdownPopup({ isOpen, activeIndex, triggerRef, popupRef, onDismiss }: UseDropdownPopupOptions): void {
  const dismiss = useEffectEvent(onDismiss);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!isOpen || trigger === null || popup === null) {
      return;
    }

    const place = () => {
      placeDropdownPopup(trigger, popup);
    };
    const handleScroll = (event: Event) => {
      if (!(event.target instanceof Node) || !popup.contains(event.target)) {
        place();
      }
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, triggerRef, popupRef]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const { target } = event;
      const isInside = target instanceof Node
        && (triggerRef.current?.contains(target) === true || popupRef.current?.contains(target) === true);
      if (!isInside) {
        dismiss(false);
      }
    };
    // Capture phase on document: Escape is consumed here so an enclosing Modal never sees it.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        dismiss(true);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, triggerRef, popupRef]);

  useEffect(() => {
    const popup = popupRef.current;
    const option = popup?.children.item(activeIndex);
    if (!isOpen || popup === null || !(option instanceof HTMLElement)) {
      return;
    }

    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (activeIndex === 0) {
      popup.scrollTop = 0;
    } else if (top < popup.scrollTop) {
      popup.scrollTop = top;
    } else if (bottom > popup.scrollTop + popup.clientHeight) {
      popup.scrollTop = bottom - popup.clientHeight;
    }
  }, [isOpen, activeIndex, popupRef]);
}
