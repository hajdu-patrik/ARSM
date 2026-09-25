/**
 * Shared vehicle specification grid for Customers vehicle rows and details panels.
 * @module pages/Customers/components/VehicleSpecsGrid
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import {
	compactTwoColumnGridClass,
	inlinePrimaryLabelTextClass,
	mutedMetaTextClass,
} from '../../../utils/formStyles';

interface VehicleSpecsGridProps {
	readonly t: TFunction;
	readonly locale: string;
	readonly vehicle: VehicleDetailDto;
	readonly className?: string;
}

/** Renders the canonical customer-facing vehicle specs without HP/torque fields. */
export const VehicleSpecsGrid = memo(function VehicleSpecsGrid({
	t,
	locale,
	vehicle,
	className = '',
}: VehicleSpecsGridProps) {
	const classNames = [compactTwoColumnGridClass, mutedMetaTextClass, className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classNames}>
			<p className="min-w-0 truncate">
				<span className={inlinePrimaryLabelTextClass}>{t('common.fields.vin')}:</span> {vehicle.vin}
			</p>
			<p className="min-w-0 truncate">
				<span className={inlinePrimaryLabelTextClass}>{t('common.fields.mileageKm')}:</span> {vehicle.mileageKm.toLocaleString(locale)} km
			</p>
			<p className="min-w-0 truncate">
				<span className={inlinePrimaryLabelTextClass}>{t('common.fields.enginePowerKw')}:</span> {vehicle.enginePowerKw} kW
			</p>
			<p className="min-w-0 truncate">
				<span className={inlinePrimaryLabelTextClass}>{t('common.fields.drivetrain')}:</span> {t(`vehicle.drivetrain.${vehicle.drivetrainType}`)}
			</p>
		</div>
	);
});

VehicleSpecsGrid.displayName = 'VehicleSpecsGrid';