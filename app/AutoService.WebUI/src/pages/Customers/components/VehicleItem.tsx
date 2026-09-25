/**
 * Vehicle item component displaying specs, history, and actions.
 * Renders vehicle details, repair history toggle, edit/delete controls.
 * @module VehicleItem
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Eye, EyeOff, FilePlus, Pencil, Trash2 } from 'lucide-react';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import {
	compactItemTitleTextClass,
	compactRowActionsClusterClass,
	compactRowHeaderClass,
	mutedMetaTextClass,
	rowIconActionAccentClass,
	rowIconActionDangerClass,
	rowIconActionInfoClass,
	rowIconActionWarningClass,
} from '../../../utils/formStyles';
import { VehicleSpecsGrid } from './VehicleSpecsGrid';

interface VehicleItemProps {
	t: TFunction;
	locale: string;
	customerId: number;
	vehicle: VehicleDetailDto;
	onOpenEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
	onOpenDeleteVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
	onOpenVehicleDetails: (customerId: number, vehicleId: number) => void;
	onCreateQuoteForVehicle: (vehicleId: number) => void;
	isDetailsOpen: boolean;
}

const VehicleItemComponent = memo(function VehicleItem({
	t,
	locale,
	customerId,
	vehicle,
	onOpenEditVehicleModal,
	onOpenDeleteVehicleModal,
	onOpenVehicleDetails,
	onCreateQuoteForVehicle,
	isDetailsOpen,
}: VehicleItemProps) {
	const detailsActionLabel = isDetailsOpen ? t('customers.hideVehicleHistory') : t('customers.showVehicleHistory');
	// A new quote is neither info, edit nor delete, so it keeps its own icon
	// and accent tone instead of borrowing one of the three fixed semantics.
	const vehicleInlineActionIconClass = 'h-3.5 w-3.5 shrink-0 text-current';

	return (
		<div className="min-w-0 px-3 py-3 sm:px-3.5">
			<div className={compactRowHeaderClass}>
				<div className="min-w-0">
					<p className={compactItemTitleTextClass}>{vehicle.licensePlate}</p>
					<p className={`truncate ${mutedMetaTextClass}`}>
						{vehicle.brand} {vehicle.model} ({vehicle.year})
					</p>
				</div>

				<div className={compactRowActionsClusterClass}>
					<button
						data-testid="vehicle-create-quote-button"
						type="button"
						onClick={() => onCreateQuoteForVehicle(vehicle.id)}
						className={rowIconActionAccentClass}
						title={t('customers.createQuote')}
						aria-label={t('customers.createQuote')}
					>
						<FilePlus className={vehicleInlineActionIconClass} />
					</button>

					<button
						type="button"
						onClick={() => onOpenVehicleDetails(customerId, vehicle.id)}
						className={rowIconActionInfoClass}
						title={detailsActionLabel}
						aria-label={detailsActionLabel}
					>
						{isDetailsOpen
							? <EyeOff className={vehicleInlineActionIconClass} />
							: <Eye className={vehicleInlineActionIconClass} />}
					</button>

					<button
						type="button"
						onClick={() => onOpenEditVehicleModal(customerId, vehicle)}
						className={rowIconActionWarningClass}
						title={t('customers.editVehicle')}
						aria-label={t('customers.editVehicle')}
					>
						<Pencil className={vehicleInlineActionIconClass} />
					</button>

					<button
						type="button"
						onClick={() => onOpenDeleteVehicleModal(customerId, vehicle)}
						className={rowIconActionDangerClass}
						title={t('customers.deleteVehicle')}
						aria-label={t('customers.deleteVehicle')}
					>
						<Trash2 className={vehicleInlineActionIconClass} />
					</button>
				</div>
			</div>

			<VehicleSpecsGrid t={t} locale={locale} vehicle={vehicle} className="mt-2" />
		</div>
	);
});

VehicleItemComponent.displayName = 'VehicleItem';
export const VehicleItem = VehicleItemComponent;