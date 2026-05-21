import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';
import {
	insetSurfaceClass,
} from '../../../../utils/formStyles';
import type { LookupMode, LookupState } from './SchedulerIntakeModal.types';
import {
	FoundCustomerSummary,
	LookupInput,
	LookupNoMatch,
	NameLookupResults,
} from './SchedulerIntakeLookupSection.parts';

interface SchedulerIntakeLookupProps {
	readonly lookupMode: LookupMode;
	readonly lookupState: LookupState;
	readonly customerLookup: SchedulerCustomerLookupDto | null;
	readonly nameLookupResults: SchedulerCustomerLookupDto[];
	readonly licensePlateLookup: string;
	readonly nameLookup: string;
	readonly isSearching: boolean;
	readonly translate: TFunction;
	readonly onLicensePlateLookupChange: (value: string) => void;
	readonly onNameLookupChange: (value: string) => void;
	readonly onSelectNameLookupResult: (customer: SchedulerCustomerLookupDto) => void;
}

/** Renders the scheduler intake customer lookup surface and delegates mode-specific UI pieces. */
export const SchedulerIntakeLookupSection = memo(function SchedulerIntakeLookupSection({
	lookupMode,
	lookupState,
	customerLookup,
	nameLookupResults,
	licensePlateLookup,
	nameLookup,
	isSearching,
	translate,
	onLicensePlateLookupChange,
	onNameLookupChange,
	onSelectNameLookupResult,
}: SchedulerIntakeLookupProps) {
	return (
		<div className={`${insetSurfaceClass} relative space-y-3 overflow-hidden p-3.5`}>
			<div
				aria-hidden="true"
				className="arsm-intake-sheen-soft pointer-events-none absolute inset-x-0 top-0 h-10"
			/>
			<h3 className="text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
				{translate('scheduler.intake.customerLookup')}
			</h3>

			<div className="space-y-1">
				<p className="text-xs text-arsm-muted dark:text-arsm-muted-dark">
					{translate('scheduler.intake.lookupLiveHint')}
				</p>
				{isSearching && (
					<p className="text-xs font-medium text-arsm-accent-vivid dark:text-arsm-accent">
						{translate('scheduler.intake.searching')}
					</p>
				)}
			</div>

			<LookupInput
				licensePlateLookup={licensePlateLookup}
				nameLookup={nameLookup}
				translate={translate}
				onLicensePlateLookupChange={onLicensePlateLookupChange}
				onNameLookupChange={onNameLookupChange}
			/>

			{lookupState === 'found' && customerLookup && (
				<FoundCustomerSummary customerLookup={customerLookup} translate={translate} />
			)}

			{lookupState === 'name-results' && (
				<NameLookupResults
					results={nameLookupResults}
					translate={translate}
					onSelect={onSelectNameLookupResult}
				/>
			)}

			{lookupState === 'not-found' && (
				<LookupNoMatch lookupMode={lookupMode} translate={translate} />
			)}
		</div>
	);
});
