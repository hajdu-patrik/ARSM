/** Column-alignment assertions for `DataList`: every rectangle of a list is read atomically in one
 * browser round trip after `document.fonts.ready`, 1px tolerance (tests/CLAUDE.md Coverage Anchors). */
import { expect, type Locator } from '@playwright/test';

/** Left edge and width of one header column or row cell. */
interface ColumnBox {
  readonly x: number;
  readonly width: number;
}

/** A row cell box with the column key the cell exposes through `data-column`. */
interface CellBox extends ColumnBox {
  readonly column: string;
}

interface ListMeasurement {
  readonly header: ColumnBox[];
  readonly rows: CellBox[][];
}

/** Tolerance for float rounding only: measurements are atomic (module doc), so this only needs to
 * absorb `getBoundingClientRect`'s own sub-pixel rounding, not a layout change landing mid-measurement. */
const DEFAULT_TOLERANCE_PX = 1;

/** Reads the header columns of the list the rows belong to and every row's cells (document order)
 * in a single page round trip. */
function measureList(rows: Locator): Promise<ListMeasurement> {
  return rows.evaluateAll(async (rowElements): Promise<ListMeasurement> => {
    await document.fonts.ready;

    const toBox = (element: Element): ColumnBox => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    };

    const header = rowElements[0]?.closest('section')?.querySelector('[data-testid="data-list-header"]');

    return {
      header: header ? Array.from(header.children).map(toBox) : [],
      rows: rowElements.map((row) => Array.from(row.querySelectorAll('[data-testid="data-list-cell"]')).map(
        (cell) => ({ column: cell.getAttribute('data-column') ?? '', ...toBox(cell) }),
      )),
    };
  });
}

export interface ColumnAlignmentOptions {
  /** The `data-column` keys, in order, that the header columns and every row's cells must carry. */
  readonly expectedColumns: readonly string[];
  /** Maximum allowed pixel drift between two cells that should align (float rounding). */
  readonly tolerancePx?: number;
}

/** Fails when the cell is further than the tolerance from the expected box in `x` or `width`. */
function expectSameColumnBox(actual: ColumnBox, expected: ColumnBox, label: string, tolerancePx: number): void {
  expect(Math.abs(actual.x - expected.x), `${label} x`).toBeLessThanOrEqual(tolerancePx);
  expect(Math.abs(actual.width - expected.width), `${label} width`).toBeLessThanOrEqual(tolerancePx);
}

/** Asserts the header and every row of a `DataList` share the same columns: keys, `x` and `width`.
 * Only meaningful in table mode; callers own the viewport and container width for that. */
export async function expectColumnsAligned(rows: Locator, options: ColumnAlignmentOptions): Promise<void> {
  const { expectedColumns, tolerancePx = DEFAULT_TOLERANCE_PX } = options;
  const { header, rows: rowBoxes } = await measureList(rows);
  const [firstRow] = rowBoxes;

  if (firstRow === undefined) {
    throw new Error('list has no data rows');
  }

  expect(header.length, 'header column count').toBe(expectedColumns.length);
  // `getBoundingClientRect` never returns null, only an all-zero rect for `display: none`, so a
  // list still in its tile layout would otherwise report a false "0 equals 0" match.
  expect(header.every((box) => box.width > 0), 'header is not visible: list is not in table mode').toBe(true);

  for (const [rowIndex, cells] of rowBoxes.entries()) {
    const rowLabel = `row ${String(rowIndex)}`;
    expect(cells.map((cell) => cell.column), `${rowLabel} columns`).toEqual([...expectedColumns]);

    for (const [columnIndex, cell] of cells.entries()) {
      const headerBox = header[columnIndex];
      const firstRowCell = firstRow[columnIndex];

      if (headerBox === undefined || firstRowCell === undefined) {
        throw new Error(`${rowLabel} has no counterpart for column ${String(columnIndex)}`);
      }

      expectSameColumnBox(cell, headerBox, `${rowLabel} "${cell.column}" vs header`, tolerancePx);
      expectSameColumnBox(cell, firstRowCell, `${rowLabel} "${cell.column}" vs first row`, tolerancePx);
    }
  }
}

/** Resolves a `DataList`'s own root `<section>` from any locator inside it - a row test id, for example. */
export function listSection(within: Locator): Locator {
  return within.locator('xpath=ancestor::section[1]');
}

interface RowActionMeasurement {
  readonly buttonCount: number;
  readonly actionX: Record<string, number | null>;
}

/** Asserts every row exposes exactly `actionTestIds.length` action buttons at the same `x`;
 * catches the "+1 icon" regression where an action rendered in one row shifts everything after it. */
export async function expectRowActionsAligned(
  rows: Locator,
  actionTestIds: readonly string[],
  tolerancePx = DEFAULT_TOLERANCE_PX,
): Promise<void> {
  const measurements = await rows.evaluateAll(async (rowElements, testIds): Promise<RowActionMeasurement[]> => {
    await document.fonts.ready;

    return rowElements.map((row) => {
      const actionX: Record<string, number | null> = {};

      for (const testId of testIds) {
        const action = row.querySelector(`[data-testid="${testId}"]`);
        actionX[testId] = action === null ? null : action.getBoundingClientRect().x;
      }

      return { buttonCount: row.querySelectorAll('button').length, actionX };
    });
  }, actionTestIds);

  expect(measurements.length, 'no rows to check').toBeGreaterThan(0);

  const firstRowX = new Map<string, number>();

  for (const [rowIndex, measurement] of measurements.entries()) {
    const rowLabel = `row ${String(rowIndex)}`;
    expect(measurement.buttonCount, `${rowLabel} action button count`).toBe(actionTestIds.length);

    for (const testId of actionTestIds) {
      const x = measurement.actionX[testId];

      if (x === null || x === undefined) {
        throw new Error(`${rowLabel} action "${testId}" has no bounding box`);
      }

      const expectedX = firstRowX.get(testId);

      if (expectedX === undefined) {
        firstRowX.set(testId, x);
      } else {
        expect(Math.abs(x - expectedX), `${rowLabel} action "${testId}" x drifted`).toBeLessThanOrEqual(tolerancePx);
      }
    }
  }
}
