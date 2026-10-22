/** Repair history sections of the details panel: each one owns the read of its customer or vehicle history. */

import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { ArrowUpDown, History } from 'lucide-react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import { useQueryReadFailureToast } from '../../../hooks/useReadFailureToast';
import { customersQueries } from '../../../services/queries/customers.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { useToastStore } from '../../../store/toast.store';
import {
  compactChipNeutralButtonClass,
  compactHeaderRowClass,
  defaultIconClass,
  inlineSectionTitleClass,
  mutedSecondaryTextClass,
  smallIconClass,
} from '../../../utils/formStyles';
import { orderRepairHistory } from '../helpers';
import type { SortDirection } from '../page.types';
import { RepairHistoryList } from './RepairHistoryList';

/** Stable empty list for the render before a history read has data. */
const NO_APPOINTMENTS: AppointmentDto[] = [];

interface RepairHistoryViewProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly title: string;
  readonly appointments: AppointmentDto[];
  readonly isLoading: boolean;
  readonly sortDirection: SortDirection;
  readonly emptyMessage: string;
  readonly emptyMessageClassName?: string | undefined;
  readonly onToggleSort: () => void;
  readonly onOpenAppointment: (appointment: AppointmentDto) => void;
}

/** Section header with the sort toggle, then the loading text or the ordered history list. */
function RepairHistoryView({
  t,
  locale,
  title,
  appointments,
  isLoading,
  sortDirection,
  emptyMessage,
  emptyMessageClassName,
  onToggleSort,
  onOpenAppointment,
}: RepairHistoryViewProps) {
  return (
    <>
      <div className={compactHeaderRowClass}>
        <h3 className={inlineSectionTitleClass}>
          <History className={defaultIconClass} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
        </h3>
        <button
          type="button"
          onClick={onToggleSort}
          className={`${compactChipNeutralButtonClass} w-full sm:w-auto`}
        >
          <ArrowUpDown className={smallIconClass} />
          <span className="min-w-0 whitespace-normal text-center">{sortDirection === 'asc' ? t('customers.historySortAsc') : t('customers.historySortDesc')}</span>
        </button>
      </div>

      {isLoading && (
        <p className={`py-6 text-center ${mutedSecondaryTextClass}`}>{t('customers.loadingHistory')}</p>
      )}

      {!isLoading && (
        <RepairHistoryList
          appointments={orderRepairHistory(appointments, sortDirection)}
          locale={locale}
          emptyMessage={emptyMessage}
          emptyMessageClassName={emptyMessageClassName}
          onOpenAppointment={onOpenAppointment}
        />
      )}
    </>
  );
}

interface CustomerRepairHistoryProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly customerId: number;
  readonly sortDirection: SortDirection;
  readonly onToggleSort: (customerId: number) => void;
  readonly onOpenAppointment: (appointment: AppointmentDto) => void;
}

export const CustomerRepairHistory = memo(function CustomerRepairHistory({
  t,
  locale,
  customerId,
  sortDirection,
  onToggleSort,
  onOpenAppointment,
}: CustomerRepairHistoryProps) {
  const scope = useAuthQueryScope();
  const historyQuery = useQuery(customersQueries.customerHistory(scope, customerId));
  const showErrorToast = useToastStore((state) => state.showError);
  useQueryReadFailureToast(historyQuery, 'customers.errors.historyLoadFailed', showErrorToast);

  return (
    <RepairHistoryView
      t={t}
      locale={locale}
      title={t('customers.customerHistoryTitle')}
      appointments={historyQuery.data ?? NO_APPOINTMENTS}
      isLoading={historyQuery.isLoading}
      sortDirection={sortDirection}
      emptyMessage={t('customers.emptyCustomerHistory')}
      onToggleSort={() => {
        onToggleSort(customerId);
      }}
      onOpenAppointment={onOpenAppointment}
    />
  );
});

interface VehicleRepairHistoryProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly vehicle: VehicleDetailDto;
  readonly sortDirection: SortDirection;
  readonly onToggleSort: (vehicleId: number) => void;
  readonly onOpenAppointment: (appointment: AppointmentDto) => void;
}

export const VehicleRepairHistory = memo(function VehicleRepairHistory({
  t,
  locale,
  vehicle,
  sortDirection,
  onToggleSort,
  onOpenAppointment,
}: VehicleRepairHistoryProps) {
  const scope = useAuthQueryScope();
  const historyQuery = useQuery(customersQueries.vehicleHistory(scope, vehicle.id));
  const showErrorToast = useToastStore((state) => state.showError);
  // The panel reuses this component for the next vehicle, so each vehicle's history is its own read.
  useQueryReadFailureToast(historyQuery, 'customers.errors.historyLoadFailed', showErrorToast, String(vehicle.id));

  return (
    <RepairHistoryView
      t={t}
      locale={locale}
      title={t('customers.vehicleHistoryForPlateTitle', { plate: vehicle.licensePlate })}
      appointments={historyQuery.data ?? NO_APPOINTMENTS}
      isLoading={historyQuery.isLoading}
      sortDirection={sortDirection}
      emptyMessage={t('customers.emptyVehicleHistory')}
      emptyMessageClassName="px-3 py-2 text-left"
      onToggleSort={() => {
        onToggleSort(vehicle.id);
      }}
      onOpenAppointment={onOpenAppointment}
    />
  );
});
