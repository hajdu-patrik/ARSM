/** Layout model of the shared data list: per-breakpoint container-query class sets, text roles and the layout probe.
 * `@X:` classes style the table layout (container >= X), `@max-X:` the tile layout; see app/AutoService.WebUI/CLAUDE.md. */
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import {
  compactItemTitleTextClass,
  metadataPillClass,
  monoIdentifierTextClass,
  mutedBodyTextClass,
  numericMutedValueTextClass,
  numericValueTextClass,
} from '../../utils/formStyles';

/** Container-query thresholds at which an aligned data list switches from labeled tiles to the column table. */
export type DataListBreakpoint = 'lg' | '3xl' | '4xl';

/** Class set one breakpoint contributes to the shared data-list grid. */
export interface DataListBreakpointClasses {
  /** Grid root: the feature adds its own `@…:grid-cols-[…]` template next to this. */
  readonly root: string;
  /** Column header row: hidden below the breakpoint, a subgrid of the root above it. */
  readonly header: string;
  /** Body wrapper: spans every track and inherits them, so header, body and rows share one column model. */
  readonly body: string;
  /** Row: a subgrid in the table layout, a two-track grid (header line, then the value cells) in the tiles, whose header line centers the title on the 44px actions. */
  readonly row: string;
  /** Full-width child of the body (for example an inline editor) once the table is active. */
  readonly fullSpan: string;
  /** Wrapper of the value cells: spans the tile row, dissolves in the table so its cells become row items. */
  readonly values: string;
  /** Cell pinned to the end of the tile header line (row actions); below 350px it drops to its own right-aligned row. */
  readonly headerEnd: string;
  /** Bordered surface of a tile cell. */
  readonly tileSurface: string;
  /** Hides an element in the table layout (tile labels, the mobile header strip). */
  readonly tilesOnly: string;
  /** Tiles wrap long values instead of ellipsizing them; undoes `truncate`. */
  readonly tileWrap: string;
  /** Tiles clamp a title at 2 lines instead of ellipsizing it; undoes `truncate`. */
  readonly tileClamp: string;
  /** Tiles show values in the primary text colour, over a muted table colour. */
  readonly tilePrimary: string;
}

/** Literal class sets per breakpoint, spelled out so Tailwind can detect every variant. */
export const dataListBreakpointClasses: Record<DataListBreakpoint, DataListBreakpointClasses> = {
  lg: {
    root: '@lg:grid @lg:gap-x-3',
    header: 'hidden @lg:col-span-full @lg:grid @lg:grid-cols-subgrid',
    body: '@lg:col-span-full @lg:grid @lg:grid-cols-subgrid',
    row: '@lg:col-span-full @lg:grid @lg:grid-cols-subgrid @lg:items-center @max-lg:grid @max-lg:grid-cols-[minmax(0,1fr)_auto] @max-lg:items-center @max-lg:gap-y-2',
    fullSpan: '@lg:col-span-full',
    values: '@max-lg:col-span-2 @max-lg:min-w-0 @lg:contents',
    headerEnd: '@max-lg:self-center @max-lg:min-[351px]:col-start-2 @max-lg:min-[351px]:row-start-1 @max-lg:min-[351px]:ml-2 @max-lg:max-[350px]:col-span-2 @max-lg:max-[350px]:row-start-2 @max-lg:max-[350px]:justify-self-end',
    tileSurface: '@max-lg:rounded-xl @max-lg:border @max-lg:border-ui-border @max-lg:bg-ui-input @max-lg:px-3 @max-lg:py-2',
    tilesOnly: '@lg:hidden',
    tileWrap: '@max-lg:overflow-visible @max-lg:text-clip @max-lg:whitespace-normal @max-lg:[overflow-wrap:anywhere]',
    tileClamp: '@max-lg:line-clamp-2 @max-lg:text-clip @max-lg:whitespace-normal @max-lg:[overflow-wrap:anywhere]',
    tilePrimary: '@max-lg:text-ui-text',
  },
  '3xl': {
    root: '@3xl:grid @3xl:gap-x-3',
    header: 'hidden @3xl:col-span-full @3xl:grid @3xl:grid-cols-subgrid',
    body: '@3xl:col-span-full @3xl:grid @3xl:grid-cols-subgrid',
    row: '@3xl:col-span-full @3xl:grid @3xl:grid-cols-subgrid @3xl:items-center @max-3xl:grid @max-3xl:grid-cols-[minmax(0,1fr)_auto] @max-3xl:items-center @max-3xl:gap-y-2',
    fullSpan: '@3xl:col-span-full',
    values: '@max-3xl:col-span-2 @max-3xl:min-w-0 @3xl:contents',
    headerEnd: '@max-3xl:self-center @max-3xl:min-[351px]:col-start-2 @max-3xl:min-[351px]:row-start-1 @max-3xl:min-[351px]:ml-2 @max-3xl:max-[350px]:col-span-2 @max-3xl:max-[350px]:row-start-2 @max-3xl:max-[350px]:justify-self-end',
    tileSurface: '@max-3xl:rounded-xl @max-3xl:border @max-3xl:border-ui-border @max-3xl:bg-ui-input @max-3xl:px-3 @max-3xl:py-2',
    tilesOnly: '@3xl:hidden',
    tileWrap: '@max-3xl:overflow-visible @max-3xl:text-clip @max-3xl:whitespace-normal @max-3xl:[overflow-wrap:anywhere]',
    tileClamp: '@max-3xl:line-clamp-2 @max-3xl:text-clip @max-3xl:whitespace-normal @max-3xl:[overflow-wrap:anywhere]',
    tilePrimary: '@max-3xl:text-ui-text',
  },
  '4xl': {
    root: '@4xl:grid @4xl:gap-x-3',
    header: 'hidden @4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid',
    body: '@4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid',
    row: '@4xl:col-span-full @4xl:grid @4xl:grid-cols-subgrid @4xl:items-center @max-4xl:grid @max-4xl:grid-cols-[minmax(0,1fr)_auto] @max-4xl:items-center @max-4xl:gap-y-2',
    fullSpan: '@4xl:col-span-full',
    values: '@max-4xl:col-span-2 @max-4xl:min-w-0 @4xl:contents',
    headerEnd: '@max-4xl:self-center @max-4xl:min-[351px]:col-start-2 @max-4xl:min-[351px]:row-start-1 @max-4xl:min-[351px]:ml-2 @max-4xl:max-[350px]:col-span-2 @max-4xl:max-[350px]:row-start-2 @max-4xl:max-[350px]:justify-self-end',
    tileSurface: '@max-4xl:rounded-xl @max-4xl:border @max-4xl:border-ui-border @max-4xl:bg-ui-input @max-4xl:px-3 @max-4xl:py-2',
    tilesOnly: '@4xl:hidden',
    tileWrap: '@max-4xl:overflow-visible @max-4xl:text-clip @max-4xl:whitespace-normal @max-4xl:[overflow-wrap:anywhere]',
    tileClamp: '@max-4xl:line-clamp-2 @max-4xl:text-clip @max-4xl:whitespace-normal @max-4xl:[overflow-wrap:anywhere]',
    tilePrimary: '@max-4xl:text-ui-text',
  },
};

/** Text role of a list value: the table keeps the shared ellipsis token, the tiles wrap or clamp it. */
export type DataListTextKind = 'title' | 'reference' | 'pill' | 'identifier' | 'amount' | 'quantity' | 'date';

/** Classes of one text role at a breakpoint: a shared table token plus the tile-only overrides. */
export function dataListTextClass(breakpoint: DataListBreakpoint, kind: DataListTextKind): string {
  const classes = dataListBreakpointClasses[breakpoint];

  switch (kind) {
    case 'title':
      return `${compactItemTitleTextClass} ${classes.tileClamp}`;
    case 'reference':
      return `${monoIdentifierTextClass} ${classes.tileWrap}`;
    case 'pill':
      return `${metadataPillClass} ${classes.tileWrap}`;
    case 'identifier':
      return `${monoIdentifierTextClass} ${classes.tileWrap} ${classes.tilePrimary}`;
    case 'amount':
      return `${numericValueTextClass} ${classes.tileWrap}`;
    case 'quantity':
      return `${numericMutedValueTextClass} ${classes.tileWrap} ${classes.tilePrimary}`;
    case 'date':
      return `min-w-0 truncate tabular-nums ${mutedBodyTextClass} ${classes.tileWrap} ${classes.tilePrimary}`;
  }
}

/** The layout the container query currently selects. */
export type DataListLayout = 'table' | 'tiles';

/** What the rows and cells of one list need from it. */
export interface DataListContextValue {
  readonly breakpoint: DataListBreakpoint;
  readonly layout: DataListLayout;
  readonly columnCount: number;
}

/** Provided by `DataList` to its rows and cells; null outside a list. */
export const DataListContext = createContext<DataListContextValue | null>(null);

/** Reads the surrounding list; rows, cells and texts only exist inside a `DataList`. */
export function useDataListContext(): DataListContextValue {
  const context = useContext(DataListContext);

  if (context === null) {
    throw new Error('DataListRow, DataListCell and DataListText render inside a DataList.');
  }

  return context;
}

/** External store shape `useSyncExternalStore` reads the current layout from. */
interface LayoutStore {
  readonly subscribe: (onChange: () => void) => () => void;
  readonly getSnapshot: () => DataListLayout;
}

/** Mirrors the container query for the ARIA roles only: the header is displayed exactly in the table layout. */
function createLayoutStore(header: HTMLElement | null): LayoutStore {
  let layout: DataListLayout = 'tiles';

  const sync = (onChange: () => void): void => {
    const next: DataListLayout = header !== null && getComputedStyle(header).display !== 'none' ? 'table' : 'tiles';

    if (next !== layout) {
      layout = next;
      onChange();
    }
  };

  return {
    getSnapshot: () => layout,
    subscribe: (onChange) => {
      if (header === null) {
        return () => undefined;
      }

      const observer = new ResizeObserver(() => { sync(onChange); });
      sync(onChange);
      observer.observe(header);

      return () => { observer.disconnect(); };
    },
  };
}

/** Reports table or tiles for the list whose header element is given; tiles until the header is mounted. */
export function useDataListLayout(header: HTMLElement | null): DataListLayout {
  const store = useMemo(() => createLayoutStore(header), [header]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
