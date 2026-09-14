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
	mutedMetaTextClass,
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
	const vehicleIconActionClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-[color,transform] duration-150 ease-out hover:scale-105 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:focus-visible:ring-arsm-focus-ring/30';
	const vehicleDetailsActionClass = `${vehicleIconActionClass} text-arsm-info-text hover:text-arsm-info-ring dark:text-arsm-info-text-dark dark:hover:text-arsm-info-text-dark`;
	// A new quote is neither info, edit nor delete, so it keeps its own icon
	// and accent tone instead of borrowing one of the three fixed semantics.
	const vehicleQuoteActionClass = `${vehicleIconActionClass} text-arsm-accent-vivid hover:text-arsm-accent-deep dark:text-arsm-accent dark:hover:text-arsm-accent-dark-hover`;
	const vehicleInlineEditActionClass = `${vehicleIconActionClass} text-arsm-warning-text hover:text-arsm-warning-accent dark:text-arsm-warning-text-dark dark:hover:text-arsm-warning-text-dark`;
	const vehicleInlineDeleteActionClass = `${vehicleIconActionClass} text-arsm-error-active hover:text-arsm-error-text dark:text-arsm-error-text-light dark:hover:text-arsm-error-text-light`;
	const vehicleInlineViewIconClass = 'h-3.5 w-3.5 shrink-0 text-current';
	const vehicleInlineEditIconClass = 'h-3.5 w-3.5 shrink-0 text-current';
	const vehicleInlineDeleteIconClass = 'h-3.5 w-3.5 shrink-0 text-current';

	return (
		<div className="min-w-0 px-3 py-3 sm:px-3.5">
			<div className="flex min-w-0 items-start justify-between gap-2">
				<div className="min-w-0">
					<p className={compactItemTitleTextClass}>{vehicle.licensePlate}</p>
					<p className={`truncate ${mutedMetaTextClass}`}>
						{vehicle.brand} {vehicle.model} ({vehicle.year})
					</p>
				</div>

				<div className="flex shrink-0 items-center gap-1 max-[350px]:flex-wrap max-[350px]:justify-end">
					<button
						data-testid="vehicle-create-quote-button"
						type="button"
						onClick={() => onCreateQuoteForVehicle(vehicle.id)}
						className={vehicleQuoteActionClass}
						title={t('customers.createQuote')}
						aria-label={t('customers.createQuote')}
					>
						<FilePlus className={vehicleInlineViewIconClass} />
					</button>

					<button
						type="button"
						onClick={() => onOpenVehicleDetails(customerId, vehicle.id)}
						className={vehicleDetailsActionClass}
						title={detailsActionLabel}
						aria-label={detailsActionLabel}
					>
						{isDetailsOpen
							? <EyeOff className={vehicleInlineViewIconClass} />
							: <Eye className={vehicleInlineViewIconClass} />}
					</button>

					<button
						type="button"
						onClick={() => onOpenEditVehicleModal(customerId, vehicle)}
						className={vehicleInlineEditActionClass}
						title={t('customers.editVehicle')}
						aria-label={t('customers.editVehicle')}
					>
						<Pencil className={vehicleInlineEditIconClass} />
					</button>

					<button
						type="button"
						onClick={() => onOpenDeleteVehicleModal(customerId, vehicle)}
						className={vehicleInlineDeleteActionClass}
						title={t('customers.deleteVehicle')}
						aria-label={t('customers.deleteVehicle')}
					>
						<Trash2 className={vehicleInlineDeleteIconClass} />
					</button>
				</div>
			</div>

			<VehicleSpecsGrid t={t} locale={locale} vehicle={vehicle} className="mt-2" />
		</div>
	);
});

VehicleItemComponent.displayName = 'VehicleItem';
export const VehicleItem = VehicleItemComponent;