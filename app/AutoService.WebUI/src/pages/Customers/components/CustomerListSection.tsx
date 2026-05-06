import { memo } from 'react';
import type { TFunction } from 'i18next';
import {
  ArrowUpDown,
  CarFront,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from 'lucide-react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import { buildCustomerDisplayName } from '../helpers';
import { RepairHistoryList } from './RepairHistoryList';
import { VehicleItem } from './VehicleItem';

type SortDirection = 'asc' | 'desc';

interface CustomerListSectionProps {
  t: TFunction;
  locale: string;
  filteredCustomers: CustomerListItem[];
  isLoadingCustomers: boolean;
  expandedCustomerIds: Set<number>;
  vehiclesByCustomerId: Record<number, VehicleDetailDto[]>;
  isLoadingVehiclesByCustomerId: Record<number, boolean>;
  customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  isLoadingCustomerHistoryByCustomerId: Record<number, boolean>;
  customerHistorySortByCustomerId: Record<number, SortDirection>;
  vehicleHistoryByVehicleId: Record<number, AppointmentDto[]>;
  isLoadingVehicleHistoryByVehicleId: Record<number, boolean>;
  vehicleHistorySortByVehicleId: Record<number, SortDirection>;
  activeVehicleHistoryByCustomerId: Record<number, number | null>;
  onToggleCustomerExpanded: (customerId: number) => void;
  onOpenEditCustomerModal: (customer: CustomerListItem) => void;
  onOpenDeleteCustomerModal: (customer: CustomerListItem) => void;
  onOpenCreateVehicleModal: (customerId: number) => void;
  onOpenEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
  onOpenDeleteVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
  onToggleCustomerHistorySort: (customerId: number) => void;
  onToggleVehicleHistory: (customerId: number, vehicleId: number) => void;
  onToggleVehicleHistorySort: (vehicleId: number) => void;
}

const CustomerListSectionComponent = memo(function CustomerListSection({
  t,
  locale,
  filteredCustomers,
  isLoadingCustomers,
  expandedCustomerIds,
  vehiclesByCustomerId,
  isLoadingVehiclesByCustomerId,
  customerHistoryByCustomerId,
  isLoadingCustomerHistoryByCustomerId,
  customerHistorySortByCustomerId,
  vehicleHistoryByVehicleId,
  isLoadingVehicleHistoryByVehicleId,
  vehicleHistorySortByVehicleId,
  activeVehicleHistoryByCustomerId,
  onToggleCustomerExpanded,
  onOpenEditCustomerModal,
  onOpenDeleteCustomerModal,
  onOpenCreateVehicleModal,
  onOpenEditVehicleModal,
  onOpenDeleteVehicleModal,
  onToggleCustomerHistorySort,
  onToggleVehicleHistory,
  onToggleVehicleHistorySort,
}: CustomerListSectionProps) {
  return (
    <section className="space-y-3">
      {isLoadingCustomers && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-arsm-accent/30 border-t-arsm-accent dark:border-arsm-accent-dark/30 dark:border-t-arsm-accent-dark" />
        </div>
      )}

      {!isLoadingCustomers && filteredCustomers.length === 0 && (
        <p className="rounded-2xl border border-dashed border-arsm-border bg-arsm-input px-4 py-12 text-center text-sm text-arsm-muted dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-muted-dark">
          {t('customers.empty')}
        </p>
      )}

      {!isLoadingCustomers && filteredCustomers.map((customer) => {
        const isExpanded = expandedCustomerIds.has(customer.id);
        const vehicles = vehiclesByCustomerId[customer.id] ?? [];
        const isLoadingVehicles = isLoadingVehiclesByCustomerId[customer.id] ?? false;
        const customerHistory = customerHistoryByCustomerId[customer.id] ?? [];
        const isLoadingCustomerHistory = isLoadingCustomerHistoryByCustomerId[customer.id] ?? false;
        const customerHistorySort = customerHistorySortByCustomerId[customer.id] ?? 'asc';
        const displayedCustomerHistory = customerHistorySort === 'asc' ? customerHistory : [...customerHistory].reverse();
        const activeVehicleHistoryId = activeVehicleHistoryByCustomerId[customer.id] ?? null;

        return (
          <article
            key={customer.id}
            data-testid={`customer-card-${customer.id}`}
            className="rounded-2xl border border-arsm-border bg-arsm-card shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_8px_18px_rgba(3,5,14,0.45)] dark:hover:shadow-[0_12px_24px_rgba(3,5,14,0.58)]"
          >
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <button
                data-testid={`customer-expand-${customer.id}`}
                type="button"
                onClick={() => onToggleCustomerExpanded(customer.id)}
                className="inline-flex items-center gap-2 text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-arsm-muted dark:text-arsm-muted-dark" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-arsm-muted dark:text-arsm-muted-dark" />
                )}
                <span className="text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                  {buildCustomerDisplayName(customer)}
                </span>
              </button>

              <div className="flex flex-wrap items-center gap-2 text-xs text-arsm-muted dark:text-arsm-muted-dark">
                <span className="rounded-full border border-arsm-border bg-arsm-toggle-bg px-2.5 py-1 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark">
                  {customer.email}
                </span>
                {customer.phoneNumber && (
                  <span className="rounded-full border border-arsm-border bg-arsm-toggle-bg px-2.5 py-1 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark">
                    {customer.phoneNumber}
                  </span>
                )}
                <span className="rounded-full border border-arsm-border bg-arsm-accent-subtle px-2.5 py-1 font-semibold text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-hover-dark dark:text-arsm-primary-dark">
                  {t('customers.vehicleCount', { count: customer.vehicleCount })}
                </span>

                <button
                  type="button"
                  onClick={() => onOpenEditCustomerModal(customer)}
                  className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2.5 py-1.5 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('customers.editCustomer')}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDeleteCustomerModal(customer)}
                  className="inline-flex items-center gap-1 rounded-lg border border-arsm-error-border px-2.5 py-1.5 text-xs font-medium text-arsm-error-accent transition hover:bg-arsm-error-bg dark:border-arsm-error-border-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('customers.deleteCustomer')}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="grid grid-cols-1 gap-4 border-t border-arsm-border bg-arsm-input/40 px-4 py-4 dark:border-arsm-border-dark dark:bg-arsm-input-dark/30 sm:px-5 lg:grid-cols-2">
                <section className="space-y-3 rounded-xl border border-arsm-border bg-arsm-card p-4 shadow-sm dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_8px_18px_rgba(3,5,14,0.45)]">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                      <CarFront className="h-4 w-4" />
                      {t('customers.vehiclesTitle')}
                    </h2>

                    <button
                      type="button"
                      onClick={() => onOpenCreateVehicleModal(customer.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2.5 py-1.5 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('customers.createVehicle')}
                    </button>
                  </div>

                  {isLoadingVehicles && (
                    <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.loadingVehicles')}</p>
                  )}

                  {!isLoadingVehicles && vehicles.length === 0 && (
                    <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.emptyVehicles')}</p>
                  )}

                  {!isLoadingVehicles && vehicles.length > 0 && (
                    <div className="space-y-2">
                      {vehicles.map((vehicle) => (
                        <VehicleItem
                          key={vehicle.id}
                          t={t}
                          locale={locale}
                          customerId={customer.id}
                          vehicle={vehicle}
                          isVehicleHistoryOpen={activeVehicleHistoryId === vehicle.id}
                          vehicleHistory={vehicleHistoryByVehicleId[vehicle.id] ?? []}
                          isLoadingVehicleHistory={isLoadingVehicleHistoryByVehicleId[vehicle.id] ?? false}
                          vehicleHistorySort={vehicleHistorySortByVehicleId[vehicle.id] ?? 'asc'}
                          onOpenEditVehicleModal={onOpenEditVehicleModal}
                          onOpenDeleteVehicleModal={onOpenDeleteVehicleModal}
                          onToggleVehicleHistory={onToggleVehicleHistory}
                          onToggleVehicleHistorySort={onToggleVehicleHistorySort}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-3 rounded-xl border border-arsm-border bg-arsm-card p-4 shadow-sm dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_8px_18px_rgba(3,5,14,0.45)]">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                      <Wrench className="h-4 w-4" />
                      {t('customers.customerHistoryTitle')}
                    </h2>

                    <button
                      type="button"
                      onClick={() => onToggleCustomerHistorySort(customer.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2 py-1 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      {customerHistorySort === 'asc' ? t('customers.historySortAsc') : t('customers.historySortDesc')}
                    </button>
                  </div>

                  {isLoadingCustomerHistory && (
                    <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.loadingHistory')}</p>
                  )}

                  {!isLoadingCustomerHistory && (
                    <RepairHistoryList
                      appointments={displayedCustomerHistory}
                      locale={locale}
                      emptyMessage={t('customers.emptyHistory')}
                    />
                  )}
                </section>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
});

CustomerListSectionComponent.displayName = 'CustomerListSection';

export const CustomerListSection = CustomerListSectionComponent;
