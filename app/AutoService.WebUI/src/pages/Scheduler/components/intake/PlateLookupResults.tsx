import { memo, useMemo } from 'react';
import { CarFront } from 'lucide-react';
import type { TFunction } from 'i18next';
import { HighlightedText } from '../../../../components/common/HighlightedText';
import { Pagination } from '../../../../components/common/Pagination';
import type {
	SchedulerCustomerLookupDto,
	SchedulerVehicleLookupDto,
} from '../../../../types/scheduler/scheduler.types';
import {
	compactInputSurfaceClass,
	compactPrimaryValueTextClass,
	defaultIconClass,
	inlineStatusTitleRowClass,
	monoIdentifierTextClass,
	mutedMetaTextClass,
	referenceChipPrimaryWrapButtonClass,
} from '../../../../utils/formStyles';
import { getLookupCustomerName } from './lookupCustomerName';
import { LOOKUP_RESULTS_PAGE_SIZE, useLookupResultsPage } from './useLookupResultsPage';

interface PlateLookupRow {
	readonly vehicle: SchedulerVehicleLookupDto;
	readonly owner: SchedulerCustomerLookupDto;
}

interface PlateLookupResultsProps {
	readonly results: SchedulerCustomerLookupDto[];
	/** Typed plate filter; its matches are highlighted in the plates. */
	readonly query: string;
	readonly translate: TFunction;
	readonly onSelect: (customer: SchedulerCustomerLookupDto) => void;
}

/** Lists one row per vehicle whose plate contains the typed plate; Select picks the owner with that vehicle. */
export const PlateLookupResults = memo(function PlateLookupResults({
	results,
	query,
	translate,
	onSelect,
}: PlateLookupResultsProps) {
	const normalizedQuery = query.trim().toUpperCase();
	const rows = useMemo<PlateLookupRow[]>(() => results.flatMap((owner) => owner.vehicles
		.filter((vehicle) => vehicle.licensePlate.toUpperCase().includes(normalizedQuery))
		.map((vehicle) => ({ vehicle, owner }))), [normalizedQuery, results]);
	const { page, pageResults, setPage } = useLookupResultsPage(rows);

	return (
		<div className={`fade-in-up space-y-2 px-3.5 py-2.5 ${compactPrimaryValueTextClass} ${compactInputSurfaceClass}`}>
			<div className={inlineStatusTitleRowClass}>
				<CarFront className={`${defaultIconClass} text-ui-muted`} />
				<span className="min-w-0 [overflow-wrap:anywhere]">{translate('scheduler.intake.plateResultsTitle', { count: rows.length })}</span>
			</div>

			<div className="divide-y divide-ui-border/60">
				{pageResults.map(({ vehicle, owner }) => (
					<div key={vehicle.id} className="flex min-w-0 flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className={monoIdentifierTextClass}>
								<HighlightedText text={vehicle.licensePlate} query={normalizedQuery} />
							</p>
							<p className={`min-w-0 [overflow-wrap:anywhere] ${mutedMetaTextClass}`}>
								{`${vehicle.brand} ${vehicle.model}`}
							</p>
							<p className={`min-w-0 [overflow-wrap:anywhere] ${mutedMetaTextClass}`}>
								{getLookupCustomerName(owner)}
							</p>
						</div>
						<button
							type="button"
							onClick={() => {
								onSelect({ ...owner, matchedVehicleId: vehicle.id });
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
				totalCount={rows.length}
				pageSize={LOOKUP_RESULTS_PAGE_SIZE}
				onPageChange={setPage}
				testIdPrefix="intake-suggestions-pagination"
			/>
		</div>
	);
});
