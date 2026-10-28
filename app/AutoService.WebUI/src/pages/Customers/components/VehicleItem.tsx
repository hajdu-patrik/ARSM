/** Vehicle item: a selectable tile (specs, history toggle) with quote, edit and delete controls. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { FilePlus, Pencil, Trash2 } from 'lucide-react';
import { HighlightedText } from '../../../components/common/HighlightedText';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import {
	compactItemTitleClampTextClass,
	compactRowActionsClusterClass,
	compactRowHeaderClass,
	insetFocusVisibleOutlineClass,
	mutedMetaTextClass,
	rowIconActionAccentClass,
	rowIconActionDangerClass,
	rowIconActionWarningClass,
	smallIconClass,
} from '../../../utils/formStyles';
import { VehicleSpecsGrid } from './VehicleSpecsGrid';

interface VehicleItemProps {
	t: TFunction;
	locale: string;
	customerId: number;
	vehicle: VehicleDetailDto;
	searchTerm: string;
	onOpenEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
	onOpenDeleteVehicleModal: ((customerId: number, vehicle: VehicleDetailDto) => void) | undefined;
	onOpenVehicleDetails: (customerId: number, vehicleId: number) => void;
	onCreateQuoteForVehicle: (vehicleId: number) => void;
	isDetailsOpen: boolean;
}

/** Tile backgrounds: a faint wash on hover and a stronger one while the vehicle's history is shown (no outline, user decision). */
const tileIdleClass = 'hover:bg-arsm-accent-subtle/50 dark:hover:bg-arsm-hover-dark/50';
const tileSelectedClass = 'bg-arsm-accent-subtle dark:bg-arsm-hover-dark';

/** Renders one vehicle tile (plate highlighted by the search) that toggles its history, with quote, edit and, for an admin, delete actions. */
export const VehicleItem = memo(function VehicleItem({
	t,
	locale,
	customerId,
	vehicle,
	searchTerm,
	onOpenEditVehicleModal,
	onOpenDeleteVehicleModal,
	onOpenVehicleDetails,
	onCreateQuoteForVehicle,
	isDetailsOpen,
}: VehicleItemProps) {
	const detailsActionLabel = isDetailsOpen ? t('customers.hideVehicleHistory') : t('customers.showVehicleHistory');

	return (
		<div
			data-testid="vehicle-tile"
			className={`relative min-w-0 px-3 py-3 transition-colors sm:px-3.5 ${isDetailsOpen ? tileSelectedClass : tileIdleClass}`}
		>
			{/* Full-tile overlay button (the Scheduler AppointmentCard pattern): a sibling of the row
					actions, so no button nests another; the content above it lets clicks fall through. */}
			<button
				data-testid="vehicle-select-button"
				type="button"
				onClick={() => {
					onOpenVehicleDetails(customerId, vehicle.id);
				}}
				aria-label={detailsActionLabel}
				title={detailsActionLabel}
				className={`absolute inset-0 z-0 cursor-pointer ${insetFocusVisibleOutlineClass}`}
			/>

			<div className="pointer-events-none relative z-10 min-w-0">
				<div className={compactRowHeaderClass}>
					<div className="min-w-0">
						<p className={compactItemTitleClampTextClass}>
							<HighlightedText text={vehicle.licensePlate} query={searchTerm} />
						</p>
						<p className={`[overflow-wrap:anywhere] ${mutedMetaTextClass}`}>
							{vehicle.brand} {vehicle.model} ({vehicle.year})
						</p>
					</div>

					<div className={`pointer-events-auto relative z-20 ${compactRowActionsClusterClass}`}>
						{/* A new quote is neither info, edit nor delete, so it keeps its own icon
								and accent tone instead of borrowing one of the three fixed semantics. */}
						<button
							data-testid="vehicle-create-quote-button"
							type="button"
							onClick={() => {
								onCreateQuoteForVehicle(vehicle.id);
							}}
							className={rowIconActionAccentClass}
							title={t('customers.createQuote')}
							aria-label={t('customers.createQuote')}
						>
							<FilePlus className={smallIconClass} />
						</button>

						<button
							type="button"
							onClick={() => {
								onOpenEditVehicleModal(customerId, vehicle);
							}}
							className={rowIconActionWarningClass}
							title={t('common.actions.editVehicle')}
							aria-label={t('common.actions.editVehicle')}
						>
							<Pencil className={smallIconClass} />
						</button>

						{onOpenDeleteVehicleModal !== undefined && (
							<button
								type="button"
								onClick={() => {
									onOpenDeleteVehicleModal(customerId, vehicle);
								}}
								className={rowIconActionDangerClass}
								title={t('customers.deleteVehicle')}
								aria-label={t('customers.deleteVehicle')}
							>
								<Trash2 className={smallIconClass} />
							</button>
						)}
					</div>
				</div>

				<VehicleSpecsGrid t={t} locale={locale} vehicle={vehicle} className="mt-2" />
			</div>
		</div>
	);
});
