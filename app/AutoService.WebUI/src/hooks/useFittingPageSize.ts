import { useLayoutEffect, useState, type RefObject } from 'react';

/** Room kept below the list for the pagination bar (44px controls plus spacing). */
const DEFAULT_RESERVED_BOTTOM_PX = 88;
/** Page size a list requests while no measurement exists; also the hook's lower clamp. */
export const DEFAULT_MIN_PAGE_SIZE = 1;
const DEFAULT_MAX_PAGE_SIZE = 50;

interface FittingPageSizeOptions {
  listRef: RefObject<HTMLElement | null>;
  fallbackItemHeightPx: number;
  /** Row pitch (height plus gap) for the current layout, used while no row is rendered yet; wins over the fallback. */
  estimateItemHeightPx?: ((list: HTMLElement) => number) | undefined;
  itemSelector?: string | undefined;
  reservedBottomPx?: number | undefined;
  min?: number | undefined;
  max?: number | undefined;
}

/** Nearest scrollable ancestor, or null when the window scrolls. */
function findScrollParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent !== null) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

/** Pitch of one item: the distance between two rendered rows (gap and divider included), else one row plus the row gap,
 * else the layout estimate (already a pitch), else the fallback plus gap. */
function resolveItemPitch(list: HTMLElement, options: FittingPageSizeOptions): number {
  const { itemSelector, estimateItemHeightPx, fallbackItemHeightPx } = options;
  const gap = Number.parseFloat(getComputedStyle(list).rowGap);
  const rowGap = Number.isFinite(gap) ? gap : 0;
  const [firstRow, secondRow] = itemSelector === undefined ? [] : Array.from(list.querySelectorAll(itemSelector)).slice(0, 2);
  const first = firstRow?.getBoundingClientRect();
  const second = secondRow?.getBoundingClientRect();
  // Only adjacent rows give a pitch; an expanded item between two samples would inflate it.
  if (first !== undefined && second !== undefined && firstRow?.nextElementSibling === secondRow && second.top > first.top) {
    return second.top - first.top;
  }
  const sampleHeight = first?.height ?? 0;
  if (sampleHeight > 0) {
    return sampleHeight + rowGap;
  }
  const estimate = estimateItemHeightPx?.(list) ?? 0;
  return estimate > 0 ? estimate : fallbackItemHeightPx + rowGap;
}

/** Whether the list has a layout box to measure from; a detached or display:none list has none. */
function isMeasurable(list: HTMLElement | null): list is HTMLElement {
  if (list === null || !list.isConnected || window.innerHeight <= 0) {
    return false;
  }
  const { width, height } = list.getBoundingClientRect();
  return width > 0 || height > 0;
}

/** Counts how many items fit between the list top (scroll-independent) and the viewport bottom; null when unmeasurable. */
function measureFit(options: FittingPageSizeOptions): number | null {
  const { listRef, reservedBottomPx = DEFAULT_RESERVED_BOTTOM_PX } = options;
  const min = options.min ?? DEFAULT_MIN_PAGE_SIZE;
  const max = options.max ?? DEFAULT_MAX_PAGE_SIZE;
  const list = listRef.current;
  if (!isMeasurable(list)) {
    return null;
  }

  const itemPitch = resolveItemPitch(list, options);
  const scroller = findScrollParent(list);
  const top = list.getBoundingClientRect().top + (scroller?.scrollTop ?? 0);
  const available = window.innerHeight - top - reservedBottomPx;

  return Math.min(max, Math.max(min, Math.floor(available / Math.max(1, itemPitch))));
}

/** Rows/cards that fit the visible height without scrolling; null only until the first layout-effect pass. */
export function useFittingPageSize(options: FittingPageSizeOptions): number | null {
  const { listRef, fallbackItemHeightPx, estimateItemHeightPx, itemSelector, reservedBottomPx, min, max } = options;
  const [pageSize, setPageSize] = useState<number | null>(null);

  useLayoutEffect(() => {
    const current = { listRef, fallbackItemHeightPx, estimateItemHeightPx, itemSelector, reservedBottomPx, min, max };
    const apply = () => {
      // An unmeasurable list keeps the last size, else the minimum, so the request still fires.
      const measured = measureFit(current);
      setPageSize((previous) => {
        const next = measured ?? previous ?? current.min ?? DEFAULT_MIN_PAGE_SIZE;
        return previous === next ? previous : next;
      });
    };

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };

    // Synchronous first measurement so the page size is known before the first request.
    apply();
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    const list = listRef.current;
    if (list !== null) {
      observer.observe(list);
      if (list.parentElement !== null) {
        observer.observe(list.parentElement);
      }
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [listRef, fallbackItemHeightPx, estimateItemHeightPx, itemSelector, reservedBottomPx, min, max]);

  return pageSize;
}
