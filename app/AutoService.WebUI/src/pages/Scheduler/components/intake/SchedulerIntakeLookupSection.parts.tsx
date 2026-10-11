import { memo } from 'react';
import { UserCheck, UserPlus, Users } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';
import {
	compactInputSurfaceClass,
	compactPrimaryValueTextClass,
	compactTwoColumnGridClass,
	defaultIconClass,
	inlineStatusTitleRowClass,
	intakeFieldLabelClass,
	intakeFieldWrapperClass,
	intakeInputClass,
	mediumContextPrimaryWrapButtonClass,
	mutedMetaTextClass,
	successNoticeSurfaceClass,
	warningNoticeSurfaceClass,
} from '../../../../utils/formStyles';
import { fieldErrorA11yProps } from '../../../../utils/fieldA11y';
import type { LookupMode } from './SchedulerIntakeModal.types';

/** Hint shown under every lookup miss; it is the same for both lookup fields. */
const LOOKUP_NO_MATCH_HINT_KEY = 'scheduler.intake.lookupNoCreateHint';

interface LookupInputProps {
	readonly licensePlateLookup: string;
	readonly nameLookup: string;
	/** Field the visible no-match notice concerns, or null while there is none. */
	readonly noMatchField: LookupMode | null;
	/** Id of the no-match notice element, the target of the field's `aria-describedby`. */
	readonly noMatchId: string;
	readonly translate: TFunction;
	readonly onLicensePlateLookupChange: (value: string) => void;
	readonly onNameLookupChange: (value: string) => void;
}

/** Renders fixed lookup controls for license plate and customer name. */
export const LookupInput = memo(function LookupInput({
	licensePlateLookup,
	nameLookup,
	noMatchField,
	noMatchId,
	translate,
	onLicensePlateLookupChange,
	onNameLookupChange,
}: LookupInputProps) {
	const noMatchText = noMatchField === null ? null : translate(getLookupNoMatchTitleKey(noMatchField));

	return (
		<div className={compactTwoColumnGridClass}>
			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.lookupName')}</span>
				<input
					type="text"
					data-testid="scheduler-intake-name-lookup"
					value={nameLookup}
					onChange={(event) => {
						onNameLookupChange(event.target.value);
					}}
					placeholder={translate('scheduler.intake.lookupNamePlaceholder')}
					className={`${intakeInputClass} truncate`}
					{...fieldErrorA11yProps(noMatchId, noMatchField === 'name' && noMatchText)}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('common.fields.licensePlate')}</span>
				<input
					type="text"
					data-testid="scheduler-intake-license-plate-lookup"
					value={licensePlateLookup}
					onChange={(event) => {
						onLicensePlateLookupChange(event.target.value);
					}}
					placeholder={translate('common.placeholders.licensePlate')}
					className={`${intakeInputClass} truncate uppercase`}
					{...fieldErrorA11yProps(noMatchId, noMatchField === 'licensePlate' && noMatchText)}
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
				<UserCheck className={defaultIconClass} />
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
		<div className={`fade-in-up space-y-2 px-3.5 py-2.5 ${compactPrimaryValueTextClass} ${compactInputSurfaceClass}`}>
			<div className={inlineStatusTitleRowClass}>
				<Users className={`${defaultIconClass} text-ui-muted`} />
				<span className="min-w-0 truncate">{translate('scheduler.intake.nameResultsTitle', { count: results.length })}</span>
			</div>

			<div className="arsm-scroll-no-bar -mx-1 max-h-56 divide-y divide-ui-border/60 overflow-y-auto px-1">
				{results.map((result) => (
					<div key={result.id} className="flex min-w-0 flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="truncate font-semibold">{getLookupCustomerName(result)}</p>
							<p className={`truncate ${mutedMetaTextClass}`}>{result.email}</p>
							<p className={`truncate ${mutedMetaTextClass}`}>
								{translate('common.fields.vehicleCount', { count: result.vehicles.length })}
							</p>
						</div>
						<button
							type="button"
							onClick={() => {
								onSelect(result);
							}}
							className={`${mediumContextPrimaryWrapButtonClass} w-full sm:w-auto sm:shrink-0`}
						>
							<span className="min-w-0 text-center">{translate('scheduler.intake.selectCustomerResult')}</span>
						</button>
					</div>
				))}
			</div>
		</div>
	);
});

interface LookupNoMatchProps {
	/** Element id the lookup field(s) point to with `aria-describedby`. */
	readonly id: string;
	readonly lookupMode: LookupMode;
	readonly translate: TFunction;
}

/** Shows lookup miss copy and hints the inline new-customer fallback path. */
export const LookupNoMatch = memo(function LookupNoMatch({ id, lookupMode, translate }: LookupNoMatchProps) {
	const titleKey = getLookupNoMatchTitleKey(lookupMode);

	return (
		<div id={id} className={`fade-in-up ${warningNoticeSurfaceClass}`}>
			<div className={inlineStatusTitleRowClass}>
				<UserPlus className={defaultIconClass} />
				<span className="min-w-0 truncate">{translate(titleKey)}</span>
			</div>
			<p className="mt-1 text-xs">{translate(LOOKUP_NO_MATCH_HINT_KEY)}</p>
		</div>
	);
});

/** Picks the no-match title key for the lookup field that found nothing. */
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

/** Joins the non-blank first, middle and last name parts of a lookup result. */
function getLookupCustomerName(customer: SchedulerCustomerLookupDto): string {
	return [customer.firstName, customer.middleName, customer.lastName]
		.filter((part): part is string => Boolean(part && part.trim().length > 0))
		.join(' ');
}