/** Places the fixed dropdown popup under its trigger, or above it when there is no room, through the CSSOM. */
const VIEWPORT_MARGIN_PX = 8;
const TRIGGER_GAP_PX = 4;
const MAX_POPUP_HEIGHT_PX = 288;
const MIN_POPUP_HEIGHT_PX = 88;

export function placeDropdownPopup(trigger: HTMLElement, popup: HTMLElement): void {
  const rect = trigger.getBoundingClientRect();
  const viewportHeight = document.documentElement.clientHeight;
  const viewportWidth = document.documentElement.clientWidth;

  const width = Math.min(rect.width, viewportWidth - 2 * VIEWPORT_MARGIN_PX);
  const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN_PX), viewportWidth - width - VIEWPORT_MARGIN_PX);
  // The width goes in first so the natural height is measured at the final wrapping.
  popup.style.setProperty('width', `${String(width)}px`);
  popup.style.setProperty('left', `${String(left)}px`);

  popup.style.maxHeight = '';
  const naturalHeight = popup.offsetHeight;
  const spaceBelow = viewportHeight - rect.bottom - TRIGGER_GAP_PX - VIEWPORT_MARGIN_PX;
  const spaceAbove = rect.top - TRIGGER_GAP_PX - VIEWPORT_MARGIN_PX;
  const opensUp = naturalHeight > spaceBelow && spaceAbove > spaceBelow;
  const available = opensUp ? spaceAbove : spaceBelow;

  const maxHeight = Math.min(MAX_POPUP_HEIGHT_PX, Math.max(available, MIN_POPUP_HEIGHT_PX));
  popup.style.setProperty('max-height', `${String(maxHeight)}px`);
  popup.style.setProperty('top', opensUp ? 'auto' : `${String(rect.bottom + TRIGGER_GAP_PX)}px`);
  popup.style.setProperty('bottom', opensUp ? `${String(viewportHeight - rect.top + TRIGGER_GAP_PX)}px` : 'auto');
}
