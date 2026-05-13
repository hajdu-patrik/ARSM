/**
 * Quick intake action section for the scheduler page.
 * Displays the selected day label and a button to open the intake modal.
 * The button is disabled when no day is selected.
 * @module SchedulerQuickIntakeSection
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { customersToolbarPrimaryButtonClass, insetSurfaceClass } from '../../../../utils/formStyles';

/** Props for the {@link SchedulerQuickIntakeSection} component. */
interface SchedulerQuickIntakeSectionProps {
	/** Localized label of the selected day, or null when no day is selected. */
	readonly selectedDateLabel: string | null;
	/** The selected Date object, or null when no day is selected. */
	readonly selectedDate: Date | null;
	/** i18next translation function. */
	readonly t: TFunction;
	/** Callback to open the intake modal for the selected day. */
	readonly onOpenIntake: () => void;
}

/** Memoized quick intake section with selected day context and action button. */
export const SchedulerQuickIntakeSection = memo(function SchedulerQuickIntakeSection({
	selectedDateLabel,
	selectedDate,
	t,
	onOpenIntake,
}: SchedulerQuickIntakeSectionProps) {
	return (
		<section className={`${insetSurfaceClass} relative overflow-hidden p-4`}>
			<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<h3 className="text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">
						{t('scheduler.intake.quickTitle')}
					</h3>
					<p className="truncate text-sm text-arsm-muted dark:text-arsm-muted-dark">
						{selectedDateLabel
							? t('scheduler.intake.quickSelectedDay', { date: selectedDateLabel })
							: t('scheduler.intake.quickSelectDayHint')}
					</p>
				</div>

				<button
					type="button"
					data-testid="scheduler-intake-open"
					onClick={onOpenIntake}
					disabled={selectedDate === null}
					className={`${customersToolbarPrimaryButtonClass} w-auto min-w-0 max-w-full self-start sm:shrink-0`}
				>
					<span className="truncate">{t('scheduler.intake.open')}</span>
				</button>
			</div>
		</section>
	);
});
