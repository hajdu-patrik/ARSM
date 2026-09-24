/**
 * Column-alignment assertions for `DataList`/`DataListRow`
 * (`src/components/common/DataList.tsx`): the header row and every data row
 * share one CSS grid via `grid-cols-subgrid`, so a column's left edge can
 * never drift with text/number length or icon count. These helpers
 * re-measure that contract from the rendered DOM instead of trusting the
 * class names, because a broken subgrid template still renders something
 * plausible-looking without them.
 *
 * Every measurement for one list (or one set of rows) is read in a single
 * `locator.evaluate`/`evaluateAll` call, after awaiting `document.fonts.ready`
 * inside the page: a web-font swap or the sidebar's own layout transition can
 * otherwise land between two sequential `boundingBox()` round trips, which
 * neither call alone would ever see.
 * @module tests/e2e/support/list-alignment
 */
import { expect, type Locator } from '@playwright/test';

/** Plain, structured-clone-safe rectangle: only what the alignment checks need. */
interface RectLike {
  readonly x: number;
  readonly width: number;
}

interface ListMeasurement {
  readonly header: RectLike[];
  readonly rows: RectLike[][];
}

/**
 * Reads every header cell's and every row's cell rectangles for one
 * `DataList` section in a single page round trip.
 * @param list The `DataList`'s own root `<section>` locator (see `listSection`).
 */
async function measureList(list: Locator): Promise<ListMeasurement> {
  return list.evaluate(async (section) => {
    await document.fonts.ready;

    const toRect = (el: Element): { x: number; width: number } => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    };

    const header = section.querySelector('[data-testid="data-list-header"]');
    const headerCells = header ? Array.from(header.children).map(toRect) : [];
    const rowWrappers = Array.from(section.querySelectorAll('[data-testid="data-list-row-cells"]'));
    const rows = rowWrappers.map((wrapper) => Array.from(wrapper.children).map(toRect));

    return { header: headerCells, rows };
  });
}

/**
 * Tolerance for float rounding of the reported rectangles only. Measurements
 * are taken atomically (see the module doc), so this does not need to absorb
 * a layout change landing mid-measurement - only the sub-pixel rounding
 * `getBoundingClientRect` itself can report.
 */
const DEFAULT_TOLERANCE_PX = 1;

export interface ColumnAlignmentOptions {
  /** Maximum allowed pixel drift between two cells that should align (float rounding). */
  readonly tolerancePx?: number;
  /**
   * Column indexes exempt from the width check, kept to their `x` position
   * only. A cell that intentionally does not stretch to fill its column -
   * `QuoteCard`'s status badge (`justify-self-start`) is the one case in this
   * codebase - legitimately renders narrower than the header on a short
   * status like "Draft".
   */
  readonly skipWidthColumns?: readonly number[];
  /** Exact number of columns the header (and therefore every row) must expose. */
  readonly expectedColumnCount?: number;
}

/**
 * Asserts that a `DataList` section's header and every data row expose the
 * same number of desktop cells, and that every column's `x` (and, unless
 * exempted, `width`) match across the header, the first row and every other
 * row. Only meaningful while the list renders its table variant; callers own
 * the viewport/container width that puts it there.
 * @param list The `DataList`'s own root `<section>` locator (see `listSection`).
 * @param options Tolerance, an exact column-count check, and per-column width exemptions.
 */
export async function expectColumnsAligned(list: Locator, options: ColumnAlignmentOptions = {}): Promise<void> {
  const { tolerancePx = DEFAULT_TOLERANCE_PX, skipWidthColumns = [], expectedColumnCount } = options;

  const { header: headerBoxes, rows: rowBoxes } = await measureList(list);
  const headerCount = headerBoxes.length;
  expect(headerCount, 'header has no columns').toBeGreaterThan(0);

  // `getBoundingClientRect` never returns null, only an all-zero rect for a
  // `display: none` subtree, so a list measured while it is still rendering
  // its tile variant would otherwise report a false "0 equals 0" match.
  expect(headerBoxes.every((box) => box.width > 0), 'header is not visible: list is not in table mode').toBe(true);

  if (expectedColumnCount !== undefined) {
    expect(headerCount, 'header column count').toBe(expectedColumnCount);
  }

  expect(rowBoxes.length, 'list has no data rows').toBeGreaterThan(0);
  const firstRowBoxes = rowBoxes[0];

  rowBoxes.forEach((cells, rowIndex) => {
    expect(cells.length, `row ${rowIndex} column count`).toBe(headerCount);

    for (let column = 0; column < headerCount; column += 1) {
      const label = `row ${rowIndex} col ${column}`;
      expect(Math.abs(cells[column].x - headerBoxes[column].x), `${label} x vs header`).toBeLessThanOrEqual(tolerancePx);
      expect(Math.abs(cells[column].x - firstRowBoxes[column].x), `${label} x vs first row`).toBeLessThanOrEqual(tolerancePx);

      if (skipWidthColumns.includes(column)) {
        continue;
      }

      expect(Math.abs(cells[column].width - headerBoxes[column].width), `${label} width vs header`).toBeLessThanOrEqual(tolerancePx);
      expect(Math.abs(cells[column].width - firstRowBoxes[column].width), `${label} width vs first row`).toBeLessThanOrEqual(tolerancePx);
    }
  });
}

/** Resolves a `DataList`'s own root `<section>` from any locator inside it - a row test id, for example. */
export function listSection(within: Locator): Locator {
  return within.locator('xpath=ancestor::section[1]');
}

interface RowActionMeasurement {
  readonly visibleButtonCount: number;
  readonly actionX: Record<string, number | null>;
}

/**
 * Asserts that every row exposes exactly `actionTestIds.length` visible
 * action buttons, and that each named action sits at the same `x` position
 * in every row. Catches the "+1 icon" regression: an action rendered in one
 * row only would shift every action after it in that row alone.
 * @param rows Every row locator (for example `page.getByTestId('quote-row')`).
 * @param actionTestIds Test ids of the actions expected in every row.
 * @param tolerancePx Maximum allowed pixel drift from float rounding.
 */
export async function expectRowActionsAligned(
  rows: Locator,
  actionTestIds: readonly string[],
  tolerancePx = DEFAULT_TOLERANCE_PX,
): Promise<void> {
  const rowCount = await rows.count();
  expect(rowCount, 'no rows to check').toBeGreaterThan(0);

  const measurements: RowActionMeasurement[] = await rows.evaluateAll(async (rowElements, testIds) => {
    await document.fonts.ready;

    // True when the element (and every ancestor) actually generates a box; the table/tiles copy switch hides one via `display: none`.
    const isRendered = (el: Element): boolean => el.getClientRects().length > 0;

    return rowElements.map((row) => {
      const visibleButtonCount = Array.from(row.querySelectorAll('button')).filter(isRendered).length;
      const actionX: Record<string, number | null> = {};

      for (const testId of testIds) {
        const match = Array.from(row.querySelectorAll(`[data-testid="${testId}"]`)).find(isRendered);
        actionX[testId] = match ? match.getBoundingClientRect().x : null;
      }

      return { visibleButtonCount, actionX };
    });
  }, actionTestIds);

  const actionXByTestId = new Map<string, number>();

  measurements.forEach((measurement, rowIndex) => {
    expect(measurement.visibleButtonCount, `row ${rowIndex} action button count`).toBe(actionTestIds.length);

    for (const testId of actionTestIds) {
      const x = measurement.actionX[testId];
      expect(x, `row ${rowIndex} action "${testId}" has no bounding box`).not.toBeNull();

      const expectedX = actionXByTestId.get(testId);
      if (expectedX === undefined) {
        actionXByTestId.set(testId, x!);
      } else {
        expect(Math.abs(x! - expectedX), `row ${rowIndex} action "${testId}" x drifted`).toBeLessThanOrEqual(tolerancePx);
      }
    }
  });
}
