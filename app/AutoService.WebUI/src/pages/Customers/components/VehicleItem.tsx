/**
 * Vehicle item component displaying specs, history, and actions.
 * Renders vehicle details, repair history toggle, edit/delete controls.
 * @module VehicleItem
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import {
	compactItemTitleTextClass,
	inlinePrimaryLabelTextClass,
	modalConfirmCloseButtonClass,
	mutedMetaTextClass,
} from '../../../utils/formStyles';

interface VehicleItemProps {
	t: TFunction;
	locale: string;
	customerId: number;
	vehicle: VehicleDetailDto;
	onOpenEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
	onOpenDeleteVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
	onOpenVehicleDetails: (customerId: number, vehicleId: number) => void;
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
	isDetailsOpen,
}: VehicleItemProps) {
	const detailsActionLabel = isDetailsOpen ? t('customers.hideVehicleHistory') : t('customers.showVehicleHistory');
	const vehicleDetailsActionClass = `${modalConfirmCloseButtonClass} min-h-11 min-w-11 ${isDetailsOpen
		? 'bg-arsm-info-bg text-arsm-info-text ring-1 ring-arsm-info-ring/45 dark:bg-arsm-info-bg-dark dark:text-arsm-info-text-dark dark:ring-arsm-info-ring/55'
		: 'text-arsm-info-text hover:text-arsm-info-text dark:text-arsm-info-text-dark dark:hover:text-arsm-info-text-dark'}`;
	const vehicleInlineEditActionClass = `${modalConfirmCloseButtonClass} min-h-11 min-w-11 text-arsm-warning-accent hover:text-arsm-warning-accent dark:text-arsm-warning-text-dark dark:hover:text-arsm-warning-text-dark`;
	const vehicleInlineDeleteActionClass = `${modalConfirmCloseButtonClass} min-h-11 min-w-11 text-arsm-error-accent hover:text-arsm-error-accent dark:text-arsm-error-text-light dark:hover:text-arsm-error-text-light`;
	const vehicleInlineViewIconClass = 'h-3.5 w-3.5 shrink-0 text-arsm-info-text dark:text-arsm-info-text-dark';
	const vehicleInlineEditIconClass = 'h-3.5 w-3.5 shrink-0 text-arsm-warning-accent dark:text-arsm-warning-text-dark';
	const vehicleInlineDeleteIconClass = 'h-3.5 w-3.5 shrink-0 text-arsm-error-accent dark:text-arsm-error-text-light';

	return (
		<div className="min-w-0 space-y-3">
			<div className="space-y-3">
				<div className="flex min-w-0 items-start justify-between gap-2">
					<div className="min-w-0">
						<p className={compactItemTitleTextClass}>{vehicle.licensePlate}</p>
						<p className={`truncate ${mutedMetaTextClass}`}>
							{vehicle.brand} {vehicle.model} ({vehicle.year})
						</p>
					</div>

						<div className="flex shrink-0 items-center gap-1 max-[350px]:flex-wrap max-[350px]:justify-end">
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

				<div className={`grid min-w-0 grid-cols-1 gap-1 ${mutedMetaTextClass} sm:grid-cols-2`}>
					<p className="min-w-0 truncate">
						<span className={inlinePrimaryLabelTextClass}>{t('customers.vin')}:</span> {vehicle.vin}
					</p>
					<p className="min-w-0 truncate">
						<span className={inlinePrimaryLabelTextClass}>{t('customers.mileageKm')}:</span> {vehicle.mileageKm.toLocaleString(locale)} km
					</p>
					<p className="min-w-0 truncate">
						<span className={inlinePrimaryLabelTextClass}>{t('customers.enginePowerKw')}:</span> {vehicle.enginePowerKw} kW
					</p>
					<p className="min-w-0 truncate">
						<span className={inlinePrimaryLabelTextClass}>{t('customers.drivetrainType')}:</span> {t(`vehicle.drivetrain.${vehicle.drivetrainType}`)}
					</p>
				</div>
			</div>
		</div>
	);
});

VehicleItemComponent.displayName = 'VehicleItem';
export const VehicleItem = VehicleItemComponent;