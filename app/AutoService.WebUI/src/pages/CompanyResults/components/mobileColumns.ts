/** Mobile column model shared by the month and VAT breakdowns (header strip and rows). */
import { dataListBreakpointClasses, uppercaseMetaLabelTextClass } from '../../../utils/formStyles';

/** Three columns from 360px; the fixed first track fits 'AJÁNLATOK' whole and keeps strip and rows aligned. */
export const mobileColumnsClass = 'grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 max-[359px]:hidden';

/** Below 360px three amounts do not fit one line, so each value gets its own labelled line instead. */
export const mobileStackedValuesClass = 'grid min-w-0 gap-1 min-[360px]:hidden';
export const mobileStackedValueRowClass = 'flex min-w-0 items-baseline justify-between gap-3';

/** Column header strip above the mobile rows; it shares `mobileColumnsClass` with them and hides once the table shows. */
export const mobileHeaderStripClass = `${mobileColumnsClass} px-3 py-2 sm:px-3.5 ${uppercaseMetaLabelTextClass} ${dataListBreakpointClasses.lg.mobileBlock}`;
