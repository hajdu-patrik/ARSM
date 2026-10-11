/** Mobile column model shared by the month and VAT breakdowns (header strip and rows). */
import { dataListBreakpointClasses } from '../../../components/common/dataListLayout';
import { uppercaseMetaLabelTextClass } from '../../../utils/formStyles';

/** Three columns from 360px; the fixed first track fits 'AJÁNLATOK' whole and keeps strip and rows aligned. */
const mobileColumnsBaseClass = 'grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-2';

/** Row values use those columns from 360px; below it every value gets its own labelled line instead. */
export const mobileValuesClass = `${mobileColumnsBaseClass} gap-y-1 max-[359px]:grid-cols-1`;

/** Value cell below 360px: label left, figure right. The label stays hidden from 360px, where the strip names the columns. */
export const mobileStackedCellClass = 'max-[359px]:flex max-[359px]:items-baseline max-[359px]:justify-between max-[359px]:gap-3';
export const mobileStackedLabelClass = 'hidden max-[359px]:block';

/** Column header strip above the mobile rows; it shares the columns with them and hides once the table shows. */
export const mobileHeaderStripClass = `${mobileColumnsBaseClass} max-[359px]:hidden px-3 py-2 sm:px-3.5 ${uppercaseMetaLabelTextClass} ${dataListBreakpointClasses.lg.tilesOnly}`;
