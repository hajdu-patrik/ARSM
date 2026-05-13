/**
 * Vehicle item component displaying specs, history, and actions.
 * Renders vehicle details, repair history toggle, edit/delete controls.
 * @module VehicleItem
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, Pencil, Trash2, Wrench } from 'lucide-react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import {
	compactSortToggleButtonClass,
	controlRowClass,
	schedulerInlineClaimButtonClass,
	schedulerInlineUnassignButtonClass,
} from '../../../utils/formStyles';
import type { SortDirection } from '../page.types';
import { RepairHistoryList } from './RepairHistoryList';

interface VehicleItemProps {
	t: TFunction;
	locale: string;
	customerId: number;
	vehicle: VehicleDetailDto;
	isVehicleHistoryOpen: boolean;
	vehicleHistory: AppointmentDto[];
	isLoadingVehicleHistory: boolean;
	vehicleHistorySort: SortDirection;
	onOpenEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
	onOpenDeleteVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
	onToggleVehicleHistory: (customerId: number, vehicleId: number) => void;
	onToggleVehicleHistorySort: (vehicleId: number) => void;
	onOpenHistoryAppointment: (appointment: AppointmentDto) => void;
}

const VehicleItemComponent = memo(function VehicleItem({
	t,
	locale,
	customerId,
	vehicle,
	isVehicleHistoryOpen,
	vehicleHistory,
	isLoadingVehicleHistory,
	vehicleHistorySort,
	onOpenEditVehicleModal,
	onOpenDeleteVehicleModal,
	onToggleVehicleHistory,
	onToggleVehicleHistorySort,
	onOpenHistoryAppointment,
}: VehicleItemProps) {
	const displayedVehicleHistory = vehicleHistorySort === 'asc' ? vehicleHistory : [...vehicleHistory].reverse();

	return (
		<div className="min-w-0 space-y-3">
			<div className="space-y-3">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">{vehicle.licensePlate}</p>
					<p className="truncate text-xs text-arsm-muted dark:text-arsm-muted-dark">
						{vehicle.brand} {vehicle.model} ({vehicle.year})
					</p>
				</div>

				<div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
					<div className="min-w-0 border-l border-arsm-border/50 pl-2 dark:border-arsm-border-dark/50">
						<p className="truncate text-[10px] font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">
							{t('customers.mileageKm')}
						</p>
						<p className="truncate text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
							{vehicle.mileageKm.toLocaleString()} km
						</p>
					</div>

					<div className="min-w-0 border-l border-arsm-border/50 pl-2 dark:border-arsm-border-dark/50">
						<p className="truncate text-[10px] font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">
							{t('customers.enginePowerHp')}
						</p>
						<p className="truncate text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">{vehicle.enginePowerHp} HP</p>
					</div>

					<div className="min-w-0 border-l border-arsm-border/50 pl-2 dark:border-arsm-border-dark/50">
						<p className="truncate text-[10px] font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">
							{t('customers.engineTorqueNm')}
						</p>
						<p className="truncate text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">{vehicle.engineTorqueNm} Nm</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => onToggleVehicleHistory(customerId, vehicle.id)}
					className={`${schedulerInlineClaimButtonClass} w-full sm:w-auto`}
				>
					<Wrench className="h-3.5 w-3.5 shrink-0" />
					<span className="truncate">{isVehicleHistoryOpen ? t('customers.hideVehicleHistory') : t('customers.showVehicleHistory')}</span>
				</button>

				{isVehicleHistoryOpen && (
					<div className="space-y-3 border-t border-arsm-border/50 pt-3 dark:border-arsm-border-dark/50">
						<div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
							<p className="min-w-0 truncate text-xs font-semibold text-arsm-primary dark:text-arsm-primary-dark">
								{t('customers.vehicleHistoryTitle')}
							</p>
							<button
								type="button"
								onClick={() => onToggleVehicleHistorySort(vehicle.id)}
								className={compactSortToggleButtonClass}
							>
								<ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
								<span className="truncate">{vehicleHistorySort === 'asc' ? t('customers.historySortAsc') : t('customers.historySortDesc')}</span>
							</button>
						</div>

						{isLoadingVehicleHistory && (
							<p className="text-xs text-arsm-muted dark:text-arsm-muted-dark">{t('customers.loadingHistory')}</p>
						)}

						{!isLoadingVehicleHistory && (
							<RepairHistoryList
								appointments={displayedVehicleHistory}
								locale={locale}
								emptyMessage={t('customers.emptyHistory')}
								onOpenAppointment={onOpenHistoryAppointment}
							/>
						)}
					</div>
				)}
			</div>

			<div className={`${controlRowClass} pt-1`}>
				<button
					type="button"
					onClick={() => onOpenEditVehicleModal(customerId, vehicle)}
					className={`${schedulerInlineClaimButtonClass} w-full sm:w-auto`}
				>
					<Pencil className="h-3.5 w-3.5 shrink-0" />
					<span className="truncate">{t('customers.editVehicle')}</span>
				</button>

				<button
					type="button"
					onClick={() => onOpenDeleteVehicleModal(customerId, vehicle)}
					className={`${schedulerInlineUnassignButtonClass} w-full sm:w-auto`}
				>
					<Trash2 className="h-3.5 w-3.5 shrink-0" />
					<span className="truncate">{t('customers.deleteVehicle')}</span>
				</button>
			</div>
		</div>
	);
});

VehicleItemComponent.displayName = 'VehicleItem';
export const VehicleItem = VehicleItemComponent;