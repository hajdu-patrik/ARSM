/** Mobile column model shared by the month and VAT breakdowns (header strip and rows). */
import { dataListBreakpointClasses } from '../../../components/common/dataListLayout';
import { uppercaseMetaLabelTextClass } from '../../../utils/formStyles';

/** Three columns from the sm breakpoint (640px); the fixed first track fits 'AJÁNLATOK' whole and keeps strip and rows aligned. */
const mobileColumnsBaseClass = 'grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-2';

/** Row values use those columns from sm; on a phone every value gets its own labelled line instead, since three amounts in one row collide there. */
export const mobileValuesClass = `${mobileColumnsBaseClass} gap-y-1 max-sm:grid-cols-1`;

/** Value cell on a phone: label left, figure right. The label stays hidden from sm, where the strip names the columns. */
export const mobileStackedCellClass = 'max-sm:flex max-sm:items-baseline max-sm:justify-between max-sm:gap-3';
export const mobileStackedLabelClass = 'hidden max-sm:block';

/** Column header strip above the mobile rows; it shares the columns with them and hides once the table shows. */
export const mobileHeaderStripClass = `${mobileColumnsBaseClass} max-sm:hidden px-3 py-2 sm:px-3.5 ${uppercaseMetaLabelTextClass} ${dataListBreakpointClasses.lg.tilesOnly}`;
