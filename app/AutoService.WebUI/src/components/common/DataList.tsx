/**
 * Shared aligned data list: one column model shared by the header and every
 * row via CSS subgrid, switching from labeled mobile tiles to the column
 * table on a container query (the list's own width), not a viewport
 * breakpoint. See `dataListBreakpointClasses` for the breakpoint tokens.
 * The header row and each row's desktop-cells/mobile-tiles wrappers carry
 * fixed `data-testid`s (`data-list-header`, `data-list-row-cells`,
 * `data-list-row-tiles`) for layout regression tests.
 * @module components/common/DataList
 */
import { memo, type ReactNode } from 'react';
import {
  contentCardFrameClass,
  dataListBreakpointClasses,
  emptyStateBoxClass,
  loadingSpinnerClass,
  uppercaseMetaLabelTextClass,
  type DataListBreakpoint,
} from '../../utils/formStyles';

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
  const breakpointClasses = dataListBreakpointClasses[breakpoint];

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
      <section className={`min-w-0 ${contentCardFrameClass} ${breakpointClasses.root} ${columnsClassName}`}>
        <div data-testid="data-list-header" className={`hidden ${breakpointClasses.subgrid} border-b border-arsm-border px-3 py-2 dark:border-arsm-border-dark sm:px-3.5 ${uppercaseMetaLabelTextClass}`}>
          {columns.map((col) => (
            col.label
              ? <span key={col.key} className={`whitespace-nowrap ${col.align === 'right' ? 'text-right' : ''}`}>{col.label}</span>
              : <span key={col.key} aria-hidden="true" />
          ))}
        </div>

        <div className={`min-w-0 divide-y divide-arsm-border/80 dark:divide-arsm-border-dark/80 ${breakpointClasses.subgrid}`}>
          {children}
        </div>
      </section>
    </div>
  );
});

DataListComponent.displayName = 'DataList';

export const DataList = DataListComponent;

interface DataListRowProps {
  readonly breakpoint: DataListBreakpoint;
  readonly testId?: string;
  readonly desktop: ReactNode;
  readonly mobile: ReactNode;
}

const DataListRowComponent = memo(function DataListRow({
  breakpoint,
  testId,
  desktop,
  mobile,
}: DataListRowProps) {
  const breakpointClasses = dataListBreakpointClasses[breakpoint];

  return (
    <div data-testid={testId} className={`min-w-0 px-3 py-3 sm:px-3.5 ${breakpointClasses.subgrid} ${breakpointClasses.rowAlign}`}>
      <div data-testid="data-list-row-cells" className={breakpointClasses.desktopCells}>{desktop}</div>
      <div data-testid="data-list-row-tiles" className={`min-w-0 space-y-2 ${breakpointClasses.mobileBlock}`}>{mobile}</div>
    </div>
  );
});

DataListRowComponent.displayName = 'DataListRow';

export const DataListRow = DataListRowComponent;
