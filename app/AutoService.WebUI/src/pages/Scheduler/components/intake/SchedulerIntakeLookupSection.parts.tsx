import { memo } from 'react';
import { UserCheck, UserPlus, Users } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';
import {
	customersToolbarPrimaryButtonClass,
	intakeFieldLabelClass,
	intakeFieldWrapperClass,
	intakeInputClass,
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
		<div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
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
		<div className="fade-in-up rounded-xl border border-arsm-success-border/60 bg-arsm-success-bg px-3.5 py-2.5 text-sm text-arsm-success-text dark:border-arsm-success-border-dark/60 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark">
			<div className="flex min-w-0 items-center gap-2 font-semibold">
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
		<div className="fade-in-up space-y-2 rounded-xl border border-arsm-border bg-arsm-input px-3.5 py-2.5 text-sm text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark">
			<div className="flex min-w-0 items-center gap-2 font-semibold">
				<Users className="h-4 w-4 shrink-0 text-arsm-muted dark:text-arsm-muted-dark" />
				<span className="min-w-0 truncate">{translate('scheduler.intake.nameResultsTitle', { count: results.length })}</span>
			</div>

			<div className="arsm-scroll-no-bar max-h-56 divide-y divide-arsm-border/60 overflow-y-auto dark:divide-arsm-border-dark/60">
				{results.map((result) => (
					<div key={result.id} className="flex min-w-0 flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="truncate font-semibold">{getLookupCustomerName(result)}</p>
							<p className="truncate text-xs text-arsm-muted dark:text-arsm-muted-dark">{result.email}</p>
							<p className="truncate text-xs text-arsm-muted dark:text-arsm-muted-dark">
								{translate('scheduler.intake.resultVehicleCount', { count: result.vehicles.length })}
							</p>
						</div>
						<button
							type="button"
							onClick={() => onSelect(result)}
							className={`${customersToolbarPrimaryButtonClass} min-h-9 w-full px-3 py-1.5 text-xs sm:w-auto sm:shrink-0`}
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
	const hintKey = getLookupNoMatchHintKey(lookupMode);

	return (
		<div className="fade-in-up rounded-xl border border-arsm-warning-border/60 bg-arsm-warning-bg px-3.5 py-2.5 text-sm text-arsm-warning-text dark:border-arsm-warning-border-dark/60 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark">
			<div className="flex min-w-0 items-center gap-2 font-semibold">
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

function getLookupNoMatchHintKey(_lookupMode: LookupMode): string {
	return 'scheduler.intake.lookupNoCreateHint';
}

function getLookupCustomerName(customer: SchedulerCustomerLookupDto): string {
	return [customer.firstName, customer.middleName, customer.lastName]
		.filter((part): part is string => Boolean(part && part.trim().length > 0))
		.join(' ');
}