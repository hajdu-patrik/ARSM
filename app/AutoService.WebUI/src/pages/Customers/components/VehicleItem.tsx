import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, Pencil, Trash2, Wrench } from 'lucide-react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import { RepairHistoryList } from './RepairHistoryList';

type SortDirection = 'asc' | 'desc';

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
}: VehicleItemProps) {
  const displayedVehicleHistory = vehicleHistorySort === 'asc' ? vehicleHistory : [...vehicleHistory].reverse();

  return (
    <div
      key={vehicle.id}
      className="space-y-2 rounded-xl border border-arsm-border bg-arsm-input px-3 py-3 dark:border-arsm-border-dark dark:bg-arsm-input-dark"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
            {vehicle.licensePlate}
          </p>
          <p className="text-xs text-arsm-muted dark:text-arsm-muted-dark">
            {vehicle.brand} {vehicle.model} ({vehicle.year})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenEditVehicleModal(customerId, vehicle)}
            className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2 py-1 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t('customers.editVehicle')}
          </button>

          <button
            type="button"
            onClick={() => onOpenDeleteVehicleModal(customerId, vehicle)}
            className="inline-flex items-center gap-1 rounded-lg border border-arsm-error-border px-2 py-1 text-xs font-medium text-arsm-error-accent transition hover:bg-arsm-error-bg dark:border-arsm-error-border-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('customers.deleteVehicle')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-arsm-label dark:text-arsm-label-dark">
        <p>{t('customers.mileageLabel', { value: vehicle.mileageKm })}</p>
        <p>{t('customers.powerLabel', { value: vehicle.enginePowerHp })}</p>
        <p>{t('customers.torqueLabel', { value: vehicle.engineTorqueNm })}</p>
      </div>

      <button
        type="button"
        onClick={() => onToggleVehicleHistory(customerId, vehicle.id)}
        className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2 py-1 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
      >
        <Wrench className="h-3.5 w-3.5" />
        {isVehicleHistoryOpen ? t('customers.hideVehicleHistory') : t('customers.showVehicleHistory')}
      </button>

      {isVehicleHistoryOpen && (
        <div className="space-y-2 rounded-lg border border-arsm-border bg-arsm-card p-3 shadow-sm dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_8px_18px_rgba(3,5,14,0.45)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-arsm-primary dark:text-arsm-primary-dark">
              {t('customers.vehicleHistoryTitle')}
            </p>

            <button
              type="button"
              onClick={() => onToggleVehicleHistorySort(vehicle.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2 py-1 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {vehicleHistorySort === 'asc' ? t('customers.historySortAsc') : t('customers.historySortDesc')}
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
            />
          )}
        </div>
      )}
    </div>
  );
});

VehicleItemComponent.displayName = 'VehicleItem';

export const VehicleItem = VehicleItemComponent;
