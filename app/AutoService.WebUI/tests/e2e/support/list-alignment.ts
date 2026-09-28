/** Column-alignment assertions for `DataList`/`DataListRow`: reads every rectangle atomically
 * after `document.fonts.ready`, 1px tolerance (tests/CLAUDE.md Coverage Anchors). */
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

/** Reads every header cell's and every row's cell rectangles for one `DataList` section
 * in a single page round trip. */
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

/** Tolerance for float rounding only: measurements are atomic (module doc), so this only needs to
 * absorb `getBoundingClientRect`'s own sub-pixel rounding, not a layout change landing mid-measurement. */
const DEFAULT_TOLERANCE_PX = 1;

export interface ColumnAlignmentOptions {
  /** Maximum allowed pixel drift between two cells that should align (float rounding). */
  readonly tolerancePx?: number;
  /** Column indexes exempt from the width check, kept to `x` only: `QuoteCard`'s status badge
   * (`justify-self-start`) legitimately renders narrower than the header on a short status. */
  readonly skipWidthColumns?: readonly number[];
  /** Exact number of columns the header (and therefore every row) must expose. */
  readonly expectedColumnCount?: number;
}

/** Asserts a `DataList` section's header and every row share the same column count and `x`/`width`
 * per column. Only meaningful in table mode; callers own the viewport/container width for that. */
export async function expectColumnsAligned(list: Locator, options: ColumnAlignmentOptions = {}): Promise<void> {
  const { tolerancePx = DEFAULT_TOLERANCE_PX, skipWidthColumns = [], expectedColumnCount } = options;

  const { header: headerBoxes, rows: rowBoxes } = await measureList(list);
  const headerCount = headerBoxes.length;
  expect(headerCount, 'header has no columns').toBeGreaterThan(0);

  // `getBoundingClientRect` never returns null, only an all-zero rect for `display: none`, so a
  // list still rendering its tile variant would otherwise report a false "0 equals 0" match.
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

/** Asserts every row exposes exactly `actionTestIds.length` visible action buttons at the same `x`;
 * catches the "+1 icon" regression where an action rendered in one row shifts everything after it. */
export async function expectRowActionsAligned(
  rows: Locator,
  actionTestIds: readonly string[],
  tolerancePx = DEFAULT_TOLERANCE_PX,
): Promise<void> {
  const rowCount = await rows.count();
  expect(rowCount, 'no rows to check').toBeGreaterThan(0);

  const measurements: RowActionMeasurement[] = await rows.evaluateAll(async (rowElements, testIds) => {
    await document.fonts.ready;

    // True when the element (and every ancestor) generates a box; the table/tiles copy switch
    // hides one copy via `display: none`.
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
