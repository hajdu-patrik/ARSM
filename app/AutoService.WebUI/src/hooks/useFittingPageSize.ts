import { useEffect, useState, type RefObject } from 'react';

/** Room kept below the list for the pagination bar (44px controls plus spacing). */
const DEFAULT_RESERVED_BOTTOM_PX = 88;
const DEFAULT_MIN_PAGE_SIZE = 1;
const DEFAULT_MAX_PAGE_SIZE = 50;

interface FittingPageSizeOptions {
  listRef: RefObject<HTMLElement | null>;
  fallbackItemHeightPx: number;
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

/** Counts how many items fit between the list top (scroll-independent) and the viewport bottom. */
function measureFit(options: FittingPageSizeOptions): number {
  const { listRef, fallbackItemHeightPx, itemSelector, reservedBottomPx = DEFAULT_RESERVED_BOTTOM_PX } = options;
  const min = options.min ?? DEFAULT_MIN_PAGE_SIZE;
  const max = options.max ?? DEFAULT_MAX_PAGE_SIZE;
  const list = listRef.current;
  if (list === null) {
    return min;
  }

  const sample = itemSelector === undefined ? null : list.querySelector(itemSelector);
  const gap = Number.parseFloat(getComputedStyle(list).rowGap);
  const sampleHeight = sample?.getBoundingClientRect().height ?? 0;
  const itemHeight = (sampleHeight > 0 ? sampleHeight : fallbackItemHeightPx) + (Number.isFinite(gap) ? gap : 0);

  const scroller = findScrollParent(list);
  const top = list.getBoundingClientRect().top + (scroller?.scrollTop ?? 0);
  const available = window.innerHeight - top - reservedBottomPx;

  return Math.min(max, Math.max(min, Math.floor(available / Math.max(1, itemHeight))));
}

/** Number of rows/cards that fit the visible height without scrolling; recomputed on resize and layout change. */
export function useFittingPageSize(options: FittingPageSizeOptions): number {
  const { listRef, fallbackItemHeightPx, itemSelector, reservedBottomPx, min, max } = options;
  const [pageSize, setPageSize] = useState(() => min ?? DEFAULT_MIN_PAGE_SIZE);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = measureFit({ listRef, fallbackItemHeightPx, itemSelector, reservedBottomPx, min, max });
        setPageSize((current) => (current === next ? current : next));
      });
    };

    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    const list = listRef.current;
    if (list !== null) {
      observer.observe(list);
      if (list.parentElement !== null) {
        observer.observe(list.parentElement);
      }
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [listRef, fallbackItemHeightPx, itemSelector, reservedBottomPx, min, max]);

  return pageSize;
}
