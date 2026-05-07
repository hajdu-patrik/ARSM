/**
 * Customer list section with expandable vehicle and history details.
 * Manages customer cards, vehicle lists, repair history, and search highlighting.
 * Handles multi-vehicle visual separation and CRUD operations.
 * @module CustomerListSection
 */
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
import {
  compactActionButtonDangerClass,
  compactActionButtonNeutralClass,
} from '../../../utils/formStyles';
import type { SortDirection } from '../page.types';
import { buildCustomerDisplayName } from '../helpers';
import { RepairHistoryList } from './RepairHistoryList';
import { VehicleItem } from './VehicleItem';

interface CustomerListSectionProps {
  t: TFunction;
  locale: string;
  searchTerm: string;
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
  onOpenHistoryAppointment: (appointment: AppointmentDto) => void;
}

const CustomerListSectionComponent = memo(function CustomerListSection({
  t,
  locale,
  searchTerm,
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
  onOpenHistoryAppointment,
}: CustomerListSectionProps) {
  const escapedSearch = searchTerm.trim().replaceAll(/[-/\\^$*+?.()|[\]{}]/g, String.raw`\$&`);
  const highlightRegex = escapedSearch.length > 0 ? new RegExp(`(${escapedSearch})`, 'ig') : null;

  const renderCustomerName = (fullName: string) => {
    if (!highlightRegex) {
      return fullName;
    }

    const parts = fullName.split(highlightRegex);
    return parts.map((part, index) => {
      if (part.length > 0 && part.toLowerCase() === searchTerm.trim().toLowerCase()) {
        return (
          <mark
            key={`${part}-${index}`}
            className="rounded border border-arsm-accent/55 bg-arsm-accent px-0.5 font-semibold text-arsm-primary dark:border-arsm-accent-dark/65 dark:bg-arsm-accent-dark dark:text-arsm-primary"
          >
            {part}
          </mark>
        );
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

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
        const hasMultipleVehicles = vehicles.length > 1;

        return (
          <article
            key={customer.id}
            data-testid={`customer-card-${customer.id}`}
            className="min-w-0 overflow-hidden rounded-2xl border border-arsm-border bg-arsm-card duration-200 dark:border-arsm-border-dark dark:bg-arsm-card-dark"
          >
            <div className="flex min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <h2 className="min-w-0 text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                <button
                  data-testid={`customer-expand-${customer.id}`}
                  type="button"
                  onClick={() => onToggleCustomerExpanded(customer.id)}
                  className="inline-flex min-w-0 max-w-full items-center gap-2 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 shrink-0 text-arsm-muted dark:text-arsm-muted-dark" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-arsm-muted dark:text-arsm-muted-dark" />
                  )}
                  <span className="min-w-0 truncate">{renderCustomerName(buildCustomerDisplayName(customer))}</span>
                </button>
              </h2>

              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-arsm-muted dark:text-arsm-muted-dark">
                <span className="inline-block min-w-0 max-w-full truncate rounded-full border border-arsm-border bg-arsm-toggle-bg px-2.5 py-1 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark">
                  {customer.email}
                </span>

                {customer.phoneNumber && (
                  <span className="inline-block min-w-0 max-w-full truncate rounded-full border border-arsm-border bg-arsm-toggle-bg px-2.5 py-1 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark">
                    {customer.phoneNumber}
                  </span>
                )}

                <span className="rounded-full border border-arsm-border bg-arsm-accent-subtle px-2.5 py-1 font-semibold text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-hover-dark dark:text-arsm-primary-dark">
                  {t('customers.vehicleCount', { count: customer.vehicleCount })}
                </span>

                <button
                  type="button"
                  onClick={() => onOpenEditCustomerModal(customer)}
                  className={compactActionButtonNeutralClass}
                >
                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t('customers.editCustomer')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDeleteCustomerModal(customer)}
                  className={compactActionButtonDangerClass}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t('customers.deleteCustomer')}</span>
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="grid grid-cols-1 gap-4 border-t border-arsm-border bg-arsm-input/40 px-4 py-4 dark:border-arsm-border-dark dark:bg-arsm-input-dark/30 sm:px-5 lg:grid-cols-2">
                <section className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                      <CarFront className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t('customers.vehiclesTitle')}</span>
                    </h3>

                    <button
                      type="button"
                      onClick={() => onOpenCreateVehicleModal(customer.id)}
                      className={compactActionButtonNeutralClass}
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{t('customers.createVehicle')}</span>
                    </button>
                  </div>

                  {isLoadingVehicles && (
                    <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.loadingVehicles')}</p>
                  )}

                  {!isLoadingVehicles && vehicles.length === 0 && (
                    <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.emptyVehicles')}</p>
                  )}

                  {!isLoadingVehicles && vehicles.length > 0 && (
                    <div className={hasMultipleVehicles ? 'divide-y divide-arsm-border/50 dark:divide-arsm-border-dark/50' : ''}>
                      {vehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className={hasMultipleVehicles
                            ? 'py-3 first:pt-0 last:pb-0'
                            : ''}
                        >
                          <VehicleItem
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
                            onOpenHistoryAppointment={onOpenHistoryAppointment}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="min-w-0 space-y-3 border-t border-arsm-border/60 pt-4 dark:border-arsm-border-dark/60 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                      <Wrench className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t('customers.customerHistoryTitle')}</span>
                    </h3>

                    <button
                      type="button"
                      onClick={() => onToggleCustomerHistorySort(customer.id)}
                      className={`${compactActionButtonNeutralClass} w-full px-2 py-1 sm:w-auto`}
                    >
                      <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{customerHistorySort === 'asc' ? t('customers.historySortAsc') : t('customers.historySortDesc')}</span>
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
                      onOpenAppointment={onOpenHistoryAppointment}
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
