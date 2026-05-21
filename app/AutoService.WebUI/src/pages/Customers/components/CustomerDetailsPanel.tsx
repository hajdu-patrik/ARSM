import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, CarFront, UserRound, Wrench, X } from 'lucide-react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import {
  modalConfirmCloseButtonClass,
  referenceChipNeutralButtonClass,
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
      <div className={isInline
        ? 'flex min-w-0 items-start justify-between gap-3 pb-2'
        : 'flex min-w-0 items-start justify-between gap-3 border-b border-arsm-border px-4 py-3 dark:border-arsm-border-dark'}>
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">
            {target.kind === 'customer' ? <UserRound className="h-4 w-4 shrink-0" /> : <CarFront className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 truncate">
              {target.kind === 'customer' ? t('customers.customerDetailsTitle') : t('customers.vehicleDetailsTitle')}
            </span>
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">
            {target.kind === 'customer' ? buildCustomerDisplayName(customer) : target.vehicle.licensePlate}
          </h2>
          <p className="truncate text-xs text-arsm-muted dark:text-arsm-muted-dark">
            {target.kind === 'customer'
              ? customer.email
              : `${target.vehicle.brand} ${target.vehicle.model} (${target.vehicle.year})`}
          </p>
        </div>

        {!isInline && onClose && (
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

      <div className={isInline ? 'arsm-scroll-no-bar max-h-[30rem] min-w-0 overflow-y-auto py-1' : 'arsm-scroll-no-bar max-h-[calc(82vh-4.5rem)] min-w-0 overflow-y-auto px-4 py-3 lg:max-h-[calc(100vh-12rem)]'}>
        {target.kind === 'vehicle' && (
          <VehicleSpecs vehicle={target.vehicle} t={t} locale={locale} />
        )}

        <section className="min-w-0 space-y-3 pt-2">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <h3 className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
              <Wrench className="h-4 w-4 shrink-0 text-arsm-warning-text dark:text-arsm-warning-text-dark" />
              <span className="truncate">{historySource.title}</span>
            </h3>
            <button
              type="button"
              onClick={historySource.toggleSort}
              className={`${referenceChipNeutralButtonClass} w-full sm:w-auto`}
            >
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{historySource.sortDirection === 'asc' ? t('customers.historySortAsc') : t('customers.historySortDesc')}</span>
            </button>
          </div>

          {historySource.isLoading && (
            <p className="py-6 text-center text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.loadingHistory')}</p>
          )}

          {!historySource.isLoading && (
            <RepairHistoryList
              appointments={displayedHistory}
              locale={locale}
              emptyMessage={t('customers.emptyHistory')}
              onOpenAppointment={onOpenHistoryAppointment}
            />
          )}
        </section>
      </div>
    </aside>
  );
});

interface VehicleSpecsProps {
  readonly vehicle: VehicleDetailDto;
  readonly t: TFunction;
  readonly locale: string;
}

const VehicleSpecs = memo(function VehicleSpecs({ vehicle, t, locale }: VehicleSpecsProps) {
  const specs = [
    [t('customers.vin'), vehicle.vin],
    [t('customers.brand'), vehicle.brand],
    [t('customers.model'), vehicle.model],
    [t('customers.year'), String(vehicle.year)],
    [t('customers.mileageKm'), `${vehicle.mileageKm.toLocaleString(locale)} km`],
    [t('customers.enginePowerKw'), `${vehicle.enginePowerKw.toLocaleString(locale)} kW`],
    [t('customers.drivetrainType'), t(`vehicle.drivetrain.${vehicle.drivetrainType}`)],
  ] as const;

  return (
    <section className="min-w-0 pb-3">
      <dl className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 text-sm sm:grid-cols-2">
        {specs.map(([label, value]) => (
          <div key={label} className="min-w-0 py-0.5">
            <dt className="truncate text-xs text-arsm-muted dark:text-arsm-muted-dark">{label}</dt>
            <dd className="truncate font-semibold text-arsm-primary dark:text-arsm-primary-dark">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
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
      title: params.t('customers.vehicleHistoryTitle'),
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