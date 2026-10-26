/** Summary strip: context date label and appointment count for the selected day (or today by default). */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import {
	compactSectionHeadingTextClass,
	compactStackedRowClass,
	insetSurfaceClass,
} from '../../../../utils/formStyles';

interface SchedulerSummaryStripProps {
	/** Localized date text describing the summary context (today or selected day). */
	readonly summaryDateText: string;
	readonly summaryCount: number;
	readonly t: TFunction;
}

/** Presentational strip showing the summary date text and the scheduled-count pill. */
export const SchedulerSummaryStrip = memo(function SchedulerSummaryStrip({
	summaryDateText,
	summaryCount,
	t,
}: SchedulerSummaryStripProps) {
	return (
		<section className={`${insetSurfaceClass} px-4 py-3.5`}>
			<div className={compactStackedRowClass}>
				<p className={`min-w-0 [overflow-wrap:anywhere] ${compactSectionHeadingTextClass}`}>{summaryDateText}</p>
				<span className="inline-flex shrink-0 items-center self-start rounded-full sm:self-auto border border-ui-border bg-ui-toggle px-3 py-1 text-xs font-semibold text-arsm-primary dark:text-arsm-hover">
					{t('scheduler.scheduledCount', { count: summaryCount })}
				</span>
			</div>
		</section>
	);
});
