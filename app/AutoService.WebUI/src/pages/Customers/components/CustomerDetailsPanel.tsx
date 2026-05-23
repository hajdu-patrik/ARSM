import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, CarFront, UserRound, X } from 'lucide-react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import {
  baseSectionHeadingTextClass,
  compactFilterChipNeutralButtonClass,
  inlineSectionTitleClass,
  modalConfirmCloseButtonClass,
  compactHeaderRowClass,
  mutedMetaTextClass,
  mutedSecondaryTextClass,
} from '../../../utils/formStyles';
import type { SortDirection } from '../page.types';
import { buildCustomerDisplayName } from '../helpers';
import { RepairHistoryList } from './RepairHistoryList';

export type ResolvedCustomerDetailsPanelTarget =
  | { readonly kind: 'customer'; readonly customer: CustomerListItem }
  | { readonly kind: 'vehicle'; readonly customer: CustomerListItem; readonly vehicle: VehicleDetailDto };

interface CustomerDetailsPanelProps {
  readonly target: ResolvedCustomerDetailsPanelTarget | null;
  readonly locale: string;
  readonly customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  readonly isLoadingCustomerHistoryByCustomerId: Record<number, boolean>;
  readonly customerHistorySortByCustomerId: Record<number, SortDirection>;
  readonly vehicleHistoryByVehicleId: Record<number, AppointmentDto[]>;
  readonly isLoadingVehicleHistoryByVehicleId: Record<number, boolean>;
  readonly vehicleHistorySortByVehicleId: Record<number, SortDirection>;
  readonly t: TFunction;
  readonly onClose?: () => void;
  readonly onToggleCustomerHistorySort: (customerId: number) => void;
  readonly onToggleVehicleHistorySort: (vehicleId: number) => void;
  readonly onOpenHistoryAppointment: (appointment: AppointmentDto) => void;
  readonly variant?: 'overlay' | 'inline';
}

/** Displays selected customer or vehicle context with lazy-loaded repair history. */
export const CustomerDetailsPanel = memo(function CustomerDetailsPanel({
  target,
  locale,
  customerHistoryByCustomerId,
  isLoadingCustomerHistoryByCustomerId,
  customerHistorySortByCustomerId,
  vehicleHistoryByVehicleId,
  isLoadingVehicleHistoryByVehicleId,
  vehicleHistorySortByVehicleId,
  t,
  onClose,
  onToggleCustomerHistorySort,
  onToggleVehicleHistorySort,
  onOpenHistoryAppointment,
  variant = 'overlay',
}: CustomerDetailsPanelProps) {
  if (!target) {
    return null;
  }

  const isInline = variant === 'inline';

  const { customer } = target;
  const historySource = getHistorySource({
    target,
    t,
    customerHistoryByCustomerId,
    isLoadingCustomerHistoryByCustomerId,
    customerHistorySortByCustomerId,
    vehicleHistoryByVehicleId,
    isLoadingVehicleHistoryByVehicleId,
    vehicleHistorySortByVehicleId,
    onToggleCustomerHistorySort,
    onToggleVehicleHistorySort,
  });
  const displayedHistory = historySource.sortDirection === 'asc'
    ? historySource.appointments
    : [...historySource.appointments].reverse();

  return (
    <aside
      aria-label={t('customers.detailsPanelTitle')}
      className={isInline
        ? 'min-w-0'
        : 'fixed inset-x-0 bottom-0 z-[90] max-h-[82vh] min-w-0 overflow-hidden rounded-t-2xl border border-arsm-border bg-arsm-card dark:border-arsm-border-dark dark:bg-arsm-card-dark lg:sticky lg:top-6 lg:z-auto lg:max-h-[calc(100vh-7rem)] lg:rounded-2xl'}
    >
      {!isInline && (
        <div className="flex min-w-0 items-start justify-between gap-3 border-b border-arsm-border px-4 py-3 dark:border-arsm-border-dark">
          <div className="min-w-0">
            <p className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">
              {target.kind === 'customer' ? <UserRound className="h-4 w-4 shrink-0" /> : <CarFront className="h-4 w-4 shrink-0" />}
              <span className="min-w-0 truncate">
                {target.kind === 'customer' ? t('customers.customerDetailsTitle') : t('customers.vehicleDetailsTitle')}
              </span>
            </p>
            <h2 className={`mt-1 truncate ${baseSectionHeadingTextClass}`}>
              {target.kind === 'customer' ? buildCustomerDisplayName(customer) : target.vehicle.licensePlate}
            </h2>
            <p className={`truncate ${mutedMetaTextClass}`}>
              {target.kind === 'customer'
                ? customer.email
                : `${target.vehicle.brand} ${target.vehicle.model} (${target.vehicle.year})`}
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={modalConfirmCloseButtonClass}
              aria-label={t('customers.closeDetailsPanel')}
              title={t('customers.closeDetailsPanel')}
            >
              <X className="h-4 w-4 shrink-0" />
            </button>
          )}
        </div>
      )}

      <div className={isInline ? 'arsm-scroll-no-bar max-h-[30rem] min-w-0 overflow-y-auto py-1' : 'arsm-scroll-no-bar max-h-[calc(82vh-4.5rem)] min-w-0 overflow-y-auto px-4 py-3 lg:max-h-[calc(100vh-12rem)]'}>
        <section className="min-w-0 space-y-3 pt-2">
          <div className={compactHeaderRowClass}>
            <h3 className={inlineSectionTitleClass}>
              <span className="truncate">{historySource.title}</span>
            </h3>
            <button
              type="button"
              onClick={historySource.toggleSort}
              className={`${compactFilterChipNeutralButtonClass} w-full sm:w-auto`}
            >
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{historySource.sortDirection === 'asc' ? t('customers.historySortAsc') : t('customers.historySortDesc')}</span>
            </button>
          </div>

          {historySource.isLoading && (
            <p className={`py-6 text-center ${mutedSecondaryTextClass}`}>{t('customers.loadingHistory')}</p>
          )}

          {!historySource.isLoading && (
            <RepairHistoryList
              appointments={displayedHistory}
              locale={locale}
              emptyMessage={target.kind === 'vehicle'
                ? t('customers.emptyVehicleHistory')
                : t('customers.emptyCustomerHistory')}
              onOpenAppointment={onOpenHistoryAppointment}
            />
          )}
        </section>
      </div>
    </aside>
  );
});

function getHistorySource(params: {
  readonly target: ResolvedCustomerDetailsPanelTarget;
  readonly t: TFunction;
  readonly customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  readonly isLoadingCustomerHistoryByCustomerId: Record<number, boolean>;
  readonly customerHistorySortByCustomerId: Record<number, SortDirection>;
  readonly vehicleHistoryByVehicleId: Record<number, AppointmentDto[]>;
  readonly isLoadingVehicleHistoryByVehicleId: Record<number, boolean>;
  readonly vehicleHistorySortByVehicleId: Record<number, SortDirection>;
  readonly onToggleCustomerHistorySort: (customerId: number) => void;
  readonly onToggleVehicleHistorySort: (vehicleId: number) => void;
}) {
  if (params.target.kind === 'vehicle') {
    const vehicleId = params.target.vehicle.id;

    return {
      title: params.t('customers.vehicleHistoryForPlateTitle', {
        plate: params.target.vehicle.licensePlate,
      }),
      appointments: params.vehicleHistoryByVehicleId[vehicleId] ?? [],
      isLoading: params.isLoadingVehicleHistoryByVehicleId[vehicleId] ?? false,
      sortDirection: params.vehicleHistorySortByVehicleId[vehicleId] ?? 'asc',
      toggleSort: () => params.onToggleVehicleHistorySort(vehicleId),
    };
  }

  const customerId = params.target.customer.id;

  return {
    title: params.t('customers.customerHistoryTitle'),
    appointments: params.customerHistoryByCustomerId[customerId] ?? [],
    isLoading: params.isLoadingCustomerHistoryByCustomerId[customerId] ?? false,
    sortDirection: params.customerHistorySortByCustomerId[customerId] ?? 'asc',
    toggleSort: () => params.onToggleCustomerHistorySort(customerId),
  };
}