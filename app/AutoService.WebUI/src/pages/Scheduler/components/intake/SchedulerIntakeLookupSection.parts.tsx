import { memo } from 'react';
import { UserCheck, UserPlus, Users } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';
import {
	compactTwoColumnGridClass,
	compactInputSurfaceClass,
	inlineStatusTitleRowClass,
	intakeFieldLabelClass,
	intakeFieldWrapperClass,
	intakeInputClass,
	mediumContextPrimaryButtonClass,
	mutedMetaTextClass,
	successNoticeSurfaceClass,
	warningNoticeSurfaceClass,
} from '../../../../utils/formStyles';
import type { LookupMode } from './SchedulerIntakeModal.types';

interface LookupInputProps {
	readonly licensePlateLookup: string;
	readonly nameLookup: string;
	readonly translate: TFunction;
	readonly onLicensePlateLookupChange: (value: string) => void;
	readonly onNameLookupChange: (value: string) => void;
}

/** Renders fixed lookup controls for license plate and customer name. */
export const LookupInput = memo(function LookupInput({
	licensePlateLookup,
	nameLookup,
	translate,
	onLicensePlateLookupChange,
	onNameLookupChange,
}: LookupInputProps) {
	return (
		<div className={compactTwoColumnGridClass}>
			<label className={`min-w-0 ${intakeFieldWrapperClass}`}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.lookupName')}</span>
				<input
					type="text"
					data-testid="scheduler-intake-name-lookup"
					value={nameLookup}
					onChange={(event) => onNameLookupChange(event.target.value)}
					placeholder={translate('scheduler.intake.lookupNamePlaceholder')}
					className={`${intakeInputClass} truncate`}
				/>
			</label>

			<label className={`min-w-0 ${intakeFieldWrapperClass}`}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.lookupLicensePlate')}</span>
				<input
					type="text"
					data-testid="scheduler-intake-license-plate-lookup"
					value={licensePlateLookup}
					onChange={(event) => onLicensePlateLookupChange(event.target.value)}
					placeholder={translate('scheduler.intake.lookupLicensePlatePlaceholder')}
					className={`${intakeInputClass} truncate uppercase`}
				/>
			</label>
		</div>
	);
});

interface FoundCustomerSummaryProps {
	readonly customerLookup: SchedulerCustomerLookupDto;
	readonly translate: TFunction;
}

/** Displays the selected customer after a successful lookup. */
export const FoundCustomerSummary = memo(function FoundCustomerSummary({
	customerLookup,
	translate,
}: FoundCustomerSummaryProps) {
	return (
		<div className={`fade-in-up ${successNoticeSurfaceClass}`}>
			<div className={inlineStatusTitleRowClass}>
				<UserCheck className="h-4 w-4 shrink-0" />
				<span className="min-w-0 truncate">{translate('scheduler.intake.customerFound')}</span>
			</div>
			<p className="mt-1 truncate">{getLookupCustomerName(customerLookup)}</p>
			<p className="truncate text-xs opacity-80">{customerLookup.email}</p>
		</div>
	);
});

interface NameLookupResultsProps {
	readonly results: SchedulerCustomerLookupDto[];
	readonly translate: TFunction;
	readonly onSelect: (customer: SchedulerCustomerLookupDto) => void;
}

/** Lists name-search candidates and exposes a direct select action for each result. */
export const NameLookupResults = memo(function NameLookupResults({
	results,
	translate,
	onSelect,
}: NameLookupResultsProps) {
	return (
		<div className={`fade-in-up space-y-2 px-3.5 py-2.5 text-sm text-arsm-primary dark:text-arsm-primary-dark ${compactInputSurfaceClass}`}>
			<div className={inlineStatusTitleRowClass}>
				<Users className="h-4 w-4 shrink-0 text-arsm-muted dark:text-arsm-muted-dark" />
				<span className="min-w-0 truncate">{translate('scheduler.intake.nameResultsTitle', { count: results.length })}</span>
			</div>

			<div className="arsm-scroll-no-bar max-h-56 divide-y divide-arsm-border/60 overflow-y-auto dark:divide-arsm-border-dark/60">
				{results.map((result) => (
					<div key={result.id} className="flex min-w-0 flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="truncate font-semibold">{getLookupCustomerName(result)}</p>
							<p className={`truncate ${mutedMetaTextClass}`}>{result.email}</p>
							<p className={`truncate ${mutedMetaTextClass}`}>
								{translate('scheduler.intake.resultVehicleCount', { count: result.vehicles.length })}
							</p>
						</div>
						<button
							type="button"
							onClick={() => onSelect(result)}
							className={`${mediumContextPrimaryButtonClass} w-full sm:w-auto sm:shrink-0`}
						>
							<span className="truncate">{translate('scheduler.intake.selectCustomerResult')}</span>
						</button>
					</div>
				))}
			</div>
		</div>
	);
});

interface LookupNoMatchProps {
	readonly lookupMode: LookupMode;
	readonly translate: TFunction;
}

/** Shows lookup miss copy and hints the inline new-customer fallback path. */
export const LookupNoMatch = memo(function LookupNoMatch({ lookupMode, translate }: LookupNoMatchProps) {
	const titleKey = getLookupNoMatchTitleKey(lookupMode);
	const hintKey = getLookupNoMatchHintKey();

	return (
		<div className={`fade-in-up ${warningNoticeSurfaceClass}`}>
			<div className={inlineStatusTitleRowClass}>
				<UserPlus className="h-4 w-4 shrink-0" />
				<span className="min-w-0 truncate">{translate(titleKey)}</span>
			</div>
			<p className="mt-1 text-xs">{translate(hintKey)}</p>
		</div>
	);
});

function getLookupNoMatchTitleKey(lookupMode: LookupMode): string {
	switch (lookupMode) {
		case 'licensePlate':
			return 'scheduler.intake.licensePlateNoMatch';
		case 'name':
			return 'scheduler.intake.nameNoMatch';
		default:
			return 'scheduler.intake.customerNotFound';
	}
}

function getLookupNoMatchHintKey(): string {
	return 'scheduler.intake.lookupNoCreateHint';
}

function getLookupCustomerName(customer: SchedulerCustomerLookupDto): string {
	return [customer.firstName, customer.middleName, customer.lastName]
		.filter((part): part is string => Boolean(part && part.trim().length > 0))
		.join(' ');
}