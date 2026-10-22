/** Quick intake section: selected-day label and a button to open the intake modal, disabled when no day is selected. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import {
	insetSurfaceClass,
	referenceChipPrimaryButtonClass,
	mutedSecondaryTextClass,
	sectionHeadingToneClass,
	toolbarRowLayoutClass,
} from '../../../../utils/formStyles';

interface SchedulerQuickIntakeSectionProps {
	readonly selectedDateLabel: string | null;
	readonly selectedDate: Date | null;
	readonly t: TFunction;
	readonly onOpenIntake: () => void;
}

export const SchedulerQuickIntakeSection = memo(function SchedulerQuickIntakeSection({
	selectedDateLabel,
	selectedDate,
	t,
	onOpenIntake,
}: SchedulerQuickIntakeSectionProps) {
	return (
		<section className={`${insetSurfaceClass} relative overflow-hidden p-4`}>
			<div className={toolbarRowLayoutClass}>
				<div className="min-w-0">
					<h3 className={`text-base ${sectionHeadingToneClass}`}>
						{t('scheduler.intake.quickTitle')}
					</h3>
					<p className={`min-w-0 [overflow-wrap:anywhere] ${mutedSecondaryTextClass}`}>
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
					className={`${referenceChipPrimaryButtonClass} h-auto! self-start sm:shrink-0`}
				>
					<span className="min-w-0 whitespace-normal text-center">{t('scheduler.intake.open')}</span>
				</button>
			</div>
		</section>
	);
});
