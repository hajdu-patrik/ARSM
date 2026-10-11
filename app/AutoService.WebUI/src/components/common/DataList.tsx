/** Shared aligned data list: one DOM per row, a subgrid table from its breakpoint up and labeled tiles below it.
 * Container queries pick the layout; a ResizeObserver only mirrors it to swap ARIA roles (see CLAUDE.md). */
import { memo, useState, type ReactNode } from 'react';
import {
  contentCardFrameClass,
  emptyStateBoxClass,
  loadingSpinnerClass,
  mutedMetaTextClass,
  uppercaseMetaLabelTextClass,
} from '../../utils/formStyles';
import {
  DataListContext,
  dataListBreakpointClasses,
  dataListTextClass,
  useDataListContext,
  useDataListLayout,
  type DataListBreakpoint,
  type DataListTextKind,
} from './dataListLayout';

/** A single header column; an empty `label` renders a hidden actions-column placeholder. */
export interface DataListColumn {
  readonly key: string;
  readonly label: string;
  readonly align?: 'left' | 'right';
}

interface DataListProps {
  readonly breakpoint: DataListBreakpoint;
  readonly columnsClassName: string;
  readonly columns: readonly DataListColumn[];
  readonly isLoading?: boolean;
  readonly loadingText?: string;
  readonly isEmpty: boolean;
  readonly emptyText: string;
  readonly emptyTestId?: string;
  readonly children: ReactNode;
}

/** List root: spinner while loading, empty box when empty, otherwise the header plus the rows on one grid. */
const DataListComponent = memo(function DataList({
  breakpoint,
  columnsClassName,
  columns,
  isLoading = false,
  loadingText,
  isEmpty,
  emptyText,
  emptyTestId,
  children,
}: DataListProps) {
  const [header, setHeader] = useState<HTMLDivElement | null>(null);
  const layout = useDataListLayout(header);
  const classes = dataListBreakpointClasses[breakpoint];
  const isTable = layout === 'table';

  if (isLoading) {
    return (
      <div role="status" aria-label={loadingText} className="flex min-w-0 items-center justify-center py-12">
        <div className={`h-8 w-8 ${loadingSpinnerClass}`} />
      </div>
    );
  }

  if (isEmpty) {
    return <p data-testid={emptyTestId} className={emptyStateBoxClass}>{emptyText}</p>;
  }

  return (
    <div className="@container min-w-0">
      <section
        role={isTable ? 'table' : 'list'}
        className={`min-w-0 ${contentCardFrameClass} ${classes.root} ${columnsClassName}`}
      >
        <div
          ref={setHeader}
          role="row"
          data-testid="data-list-header"
          className={`${classes.header} border-b border-ui-border px-3 py-2 sm:px-3.5 ${uppercaseMetaLabelTextClass}`}
        >
          {columns.map((column) => (
            column.label
              ? <span key={column.key} role="columnheader" className={`whitespace-nowrap ${column.align === 'right' ? 'text-right' : ''}`}>{column.label}</span>
              : <span key={column.key} aria-hidden="true" />
          ))}
        </div>

        <div role={isTable ? 'rowgroup' : undefined} className={`min-w-0 divide-y divide-ui-border/80 ${classes.body}`}>
          <DataListContext value={{ breakpoint, layout, columnCount: columns.length }}>
            {children}
          </DataListContext>
        </div>
      </section>
    </div>
  );
});

DataListComponent.displayName = 'DataList';

export const DataList = DataListComponent;

interface DataListRowProps {
  readonly testId?: string;
  /** First cell; in the tile layout it shares the header line with the actions cell. */
  readonly lead?: ReactNode;
  /** Tile-layout grid of the value cells below the header line; the table layout dissolves it. */
  readonly valuesClassName?: string;
  /** Last cell (row actions), pinned to the end of the tile header line. */
  readonly actions?: ReactNode;
  /** The value cells between lead and actions, in column order. */
  readonly children: ReactNode;
}

/** One row, rendered once: a subgrid row in the table layout, a header line plus value tiles below it. */
const DataListRowComponent = memo(function DataListRow({
  testId,
  lead,
  valuesClassName = '',
  actions,
  children,
}: DataListRowProps) {
  const { breakpoint, layout } = useDataListContext();
  const classes = dataListBreakpointClasses[breakpoint];

  return (
    <div
      role={layout === 'table' ? 'row' : 'listitem'}
      data-testid={testId}
      className={`min-w-0 px-3 py-3 sm:px-3.5 ${classes.row}`}
    >
      {lead}
      <div className={`${valuesClassName} ${classes.values}`}>{children}</div>
      {actions}
    </div>
  );
});

DataListRowComponent.displayName = 'DataListRow';

export const DataListRow = DataListRowComponent;

interface DataListCellProps {
  /** Column key of the list header; exposed as `data-column`. */
  readonly column: string;
  /** Shown above the value in the tile layout only: the column header names the cell in the table. */
  readonly label?: string;
  /** Gives the cell the bordered tile surface in the tile layout. */
  readonly tile?: boolean;
  /** Pins the cell to the end of the tile header line (row actions). */
  readonly headerEnd?: boolean;
  readonly className?: string;
  /** Replaces the default label visibility (every tile layout) with the caller's classes. */
  readonly labelClassName?: string;
  readonly children: ReactNode;
}

/** One cell, rendered once; table cell above the breakpoint, tile (with its label) below it. */
const DataListCellComponent = memo(function DataListCell({
  column,
  label,
  tile = false,
  headerEnd = false,
  className = '',
  labelClassName,
  children,
}: DataListCellProps) {
  const { breakpoint, layout } = useDataListContext();
  const classes = dataListBreakpointClasses[breakpoint];

  return (
    <div
      role={layout === 'table' ? 'cell' : undefined}
      data-testid="data-list-cell"
      data-column={column}
      className={`min-w-0 ${tile ? classes.tileSurface : ''} ${headerEnd ? classes.headerEnd : ''} ${className}`}
    >
      {label !== undefined && (
        <p data-testid="data-list-cell-label" className={`${mutedMetaTextClass} ${labelClassName ?? classes.tilesOnly}`}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
});

DataListCellComponent.displayName = 'DataListCell';

export const DataListCell = DataListCellComponent;

interface DataListTextProps {
  readonly kind: DataListTextKind;
  /** Tooltip for the ellipsized table cell. */
  readonly title?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Value text of a cell: one text role, ellipsized in the table and wrapped or clamped in the tiles. */
const DataListTextComponent = memo(function DataListText({ kind, title, className = '', children }: DataListTextProps) {
  const { breakpoint } = useDataListContext();

  return <p title={title} className={`${dataListTextClass(breakpoint, kind)} ${className}`}>{children}</p>;
});

DataListTextComponent.displayName = 'DataListText';

export const DataListText = DataListTextComponent;

interface DataListFullRowProps {
  readonly children: ReactNode;
}

/** Full-width row (for example an inline editor): one cell spanning every column in the table layout. */
const DataListFullRowComponent = memo(function DataListFullRow({ children }: DataListFullRowProps) {
  const { breakpoint, layout, columnCount } = useDataListContext();
  const isTable = layout === 'table';

  return (
    <div role={isTable ? 'row' : 'listitem'} className={dataListBreakpointClasses[breakpoint].fullSpan}>
      <div role={isTable ? 'cell' : undefined} aria-colspan={isTable ? columnCount : undefined}>{children}</div>
    </div>
  );
});

DataListFullRowComponent.displayName = 'DataListFullRow';

export const DataListFullRow = DataListFullRowComponent;
