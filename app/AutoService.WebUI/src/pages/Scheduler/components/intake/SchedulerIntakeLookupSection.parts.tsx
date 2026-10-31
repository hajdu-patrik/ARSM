import { memo, useId } from 'react';
import { UserCheck, UserPlus, Users } from 'lucide-react';
import type { TFunction } from 'i18next';
import { HighlightedText } from '../../../../components/common/HighlightedText';
import { Pagination } from '../../../../components/common/Pagination';
import { getLookupCustomerName } from './lookupCustomerName';
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
	referenceChipPrimaryWrapButtonClass,
	mutedMetaTextClass,
	successNoticeSurfaceClass,
	toneTextClasses,
	warningNoticeSurfaceClass,
} from '../../../../utils/formStyles';
import { fieldErrorA11yProps } from '../../../../utils/fieldA11y';
import type { LookupMode } from './SchedulerIntakeModal.types';
import { LOOKUP_RESULTS_PAGE_SIZE, useLookupResultsPage } from './useLookupResultsPage';

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
	const noteId = useId();
	const noMatchText = noMatchField === null ? null : translate(getLookupNoMatchTitleKey(noMatchField));
	const isNameDisabled = licensePlateLookup.trim().length > 0;
	const isLicensePlateDisabled = nameLookup.trim().length > 0;
	const note = (
		<p id={noteId} data-testid="scheduler-intake-single-filter-note" className={`text-xs ${toneTextClasses.neutral}`}>
			{translate('scheduler.intake.singleFilterNote')}
		</p>
	);

	return (
		<div className={compactTwoColumnGridClass}>
			<div className="min-w-0 space-y-1">
				<label className={intakeFieldWrapperClass}>
					<span className={intakeFieldLabelClass}>{translate('scheduler.intake.lookupName')}</span>
					<input
						type="text"
						data-testid="scheduler-intake-name-lookup"
						value={nameLookup}
						onChange={(event) => {
							onNameLookupChange(event.target.value);
						}}
						disabled={isNameDisabled}
						placeholder={translate('scheduler.intake.lookupNamePlaceholder')}
						className={`${intakeInputClass} truncate`}
						aria-describedby={isNameDisabled ? noteId : undefined}
						{...fieldErrorA11yProps(noMatchId, noMatchField === 'name' && noMatchText)}
					/>
				</label>
				{isNameDisabled && note}
			</div>

			<div className="min-w-0 space-y-1">
				<label className={intakeFieldWrapperClass}>
					<span className={intakeFieldLabelClass}>{translate('common.fields.licensePlate')}</span>
					<input
						type="text"
						data-testid="scheduler-intake-license-plate-lookup"
						value={licensePlateLookup}
						onChange={(event) => {
							onLicensePlateLookupChange(event.target.value);
						}}
						disabled={isLicensePlateDisabled}
						placeholder={translate('common.placeholders.licensePlate')}
						className={`${intakeInputClass} truncate uppercase`}
						aria-describedby={isLicensePlateDisabled ? noteId : undefined}
						{...fieldErrorA11yProps(noMatchId, noMatchField === 'licensePlate' && noMatchText)}
					/>
				</label>
				{isLicensePlateDisabled && note}
			</div>
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
				<span className="min-w-0 [overflow-wrap:anywhere]">{translate('scheduler.intake.customerFound')}</span>
			</div>
			<p className="mt-1 min-w-0 [overflow-wrap:anywhere]">{getLookupCustomerName(customerLookup)}</p>
			<p className="min-w-0 text-xs [overflow-wrap:anywhere]">{customerLookup.email}</p>
		</div>
	);
});

interface NameLookupResultsProps {
	readonly results: SchedulerCustomerLookupDto[];
	/** Typed name filter; its matches are highlighted in the shown texts. */
	readonly query: string;
	readonly translate: TFunction;
	readonly onSelect: (customer: SchedulerCustomerLookupDto) => void;
}

/** Lists name-search candidates, five per page, and exposes a direct select action for each result. */
export const NameLookupResults = memo(function NameLookupResults({
	results,
	query,
	translate,
	onSelect,
}: NameLookupResultsProps) {
	const { page, pageResults, setPage } = useLookupResultsPage(results);

	return (
		<div className={`fade-in-up space-y-2 px-3.5 py-2.5 ${compactPrimaryValueTextClass} ${compactInputSurfaceClass}`}>
			<div className={inlineStatusTitleRowClass}>
				<Users className={`${defaultIconClass} text-ui-muted`} />
				<span className="min-w-0 [overflow-wrap:anywhere]">{translate('scheduler.intake.nameResultsTitle', { count: results.length })}</span>
			</div>

			<div className="divide-y divide-ui-border/60">
				{pageResults.map((result) => (
					<div key={result.id} className="flex min-w-0 flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="min-w-0 font-semibold [overflow-wrap:anywhere]">
								<HighlightedText text={getLookupCustomerName(result)} query={query} />
							</p>
							<p className={`min-w-0 [overflow-wrap:anywhere] ${mutedMetaTextClass}`}>
								<HighlightedText text={result.email} query={query} />
							</p>
							<p className={`min-w-0 [overflow-wrap:anywhere] ${mutedMetaTextClass}`}>
								{translate('common.fields.vehicleCount', { count: result.vehicles.length })}
							</p>
						</div>
						<button
							type="button"
							onClick={() => {
								onSelect(result);
							}}
							className={`${referenceChipPrimaryWrapButtonClass} w-full sm:w-auto sm:shrink-0`}
						>
							<span className="min-w-0 text-center">{translate('scheduler.intake.selectCustomerResult')}</span>
						</button>
					</div>
				))}
			</div>

			<Pagination
				compact
				page={page}
				totalCount={results.length}
				pageSize={LOOKUP_RESULTS_PAGE_SIZE}
				onPageChange={setPage}
				testIdPrefix="intake-suggestions-pagination"
			/>
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
				<span className="min-w-0 [overflow-wrap:anywhere]">{translate(titleKey)}</span>
			</div>
			<p className="mt-1 text-xs">{translate(LOOKUP_NO_MATCH_HINT_KEY)}</p>
		</div>
	);
});

/** Maps the lookup mode to the title key of its no-match notice. */
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
