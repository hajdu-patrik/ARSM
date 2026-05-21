/**
 * Customer list section with expandable vehicle and history details.
 * Manages customer cards, vehicle lists, repair history, and search highlighting.
 * Handles multi-vehicle visual separation and CRUD operations.
 * @module CustomerListSection
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import {
  CarFront,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import {
  referenceChipDangerButtonClass,
  referenceChipNeutralButtonClass,
  referenceChipPrimaryButtonClass,
} from '../../../utils/formStyles';
import { buildCustomerDisplayName } from '../helpers';
import type { SortDirection } from '../page.types';
import { CustomerDetailsPanel, type ResolvedCustomerDetailsPanelTarget } from './CustomerDetailsPanel';
import { VehicleItem } from './VehicleItem';

interface CustomerListSectionProps {
  t: TFunction;
  searchTerm: string;
  filteredCustomers: CustomerListItem[];
  isLoadingCustomers: boolean;
  expandedCustomerIds: Set<number>;
  vehiclesByCustomerId: Record<number, VehicleDetailDto[]>;
  isLoadingVehiclesByCustomerId: Record<number, boolean>;
  onToggleCustomerExpanded: (customerId: number) => void;
  onOpenCustomerDetails: (customerId: number) => void;
  onOpenEditCustomerModal: (customer: CustomerListItem) => void;
  onOpenDeleteCustomerModal: (customer: CustomerListItem) => void;
  onOpenCreateVehicleModal: (customerId: number) => void;
  onOpenEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
  onOpenDeleteVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
  onOpenVehicleDetails: (customerId: number, vehicleId: number) => void;
  resolvedDetailsTarget: ResolvedCustomerDetailsPanelTarget | null;
  locale: string;
  customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  isLoadingCustomerHistoryByCustomerId: Record<number, boolean>;
  customerHistorySortByCustomerId: Record<number, SortDirection>;
  vehicleHistoryByVehicleId: Record<number, AppointmentDto[]>;
  isLoadingVehicleHistoryByVehicleId: Record<number, boolean>;
  vehicleHistorySortByVehicleId: Record<number, SortDirection>;
  onToggleCustomerHistorySort: (customerId: number) => void;
  onToggleVehicleHistorySort: (vehicleId: number) => void;
  onOpenHistoryAppointment: (appointment: AppointmentDto) => void;
}

const CustomerListSectionComponent = memo(function CustomerListSection({
  t,
  searchTerm,
  filteredCustomers,
  isLoadingCustomers,
  expandedCustomerIds,
  vehiclesByCustomerId,
  isLoadingVehiclesByCustomerId,
  onToggleCustomerExpanded,
  onOpenCustomerDetails,
  onOpenEditCustomerModal,
  onOpenDeleteCustomerModal,
  onOpenCreateVehicleModal,
  onOpenEditVehicleModal,
  onOpenDeleteVehicleModal,
  onOpenVehicleDetails,
  resolvedDetailsTarget,
  locale,
  customerHistoryByCustomerId,
  isLoadingCustomerHistoryByCustomerId,
  customerHistorySortByCustomerId,
  vehicleHistoryByVehicleId,
  isLoadingVehicleHistoryByVehicleId,
  vehicleHistorySortByVehicleId,
  onToggleCustomerHistorySort,
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
        <div className="flex min-w-0 items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin motion-reduce:animate-none rounded-full border-[3px] border-arsm-accent/30 border-t-arsm-accent dark:border-arsm-accent-dark/30 dark:border-t-arsm-accent-dark" />
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
        const activeTargetForCustomer = resolvedDetailsTarget?.customer.id === customer.id
          ? resolvedDetailsTarget
          : null;
        const detailsTargetForCustomer: ResolvedCustomerDetailsPanelTarget = activeTargetForCustomer ?? {
          kind: 'customer',
          customer,
        };
        const isVehicleDetailsOpen = activeTargetForCustomer?.kind === 'vehicle'
          ? activeTargetForCustomer.vehicle.id
          : null;

        return (
          <article
            key={customer.id}
            data-testid={`customer-card-${customer.id}`}
            className="min-w-0 overflow-hidden rounded-2xl border border-arsm-border bg-arsm-card duration-200 dark:border-arsm-border-dark dark:bg-arsm-card-dark"
          >
            <div className="flex min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                <button
                  data-testid={`customer-expand-${customer.id}`}
                  type="button"
                  onClick={() => {
                    onToggleCustomerExpanded(customer.id);
                    if (!isExpanded) {
                      onOpenCustomerDetails(customer.id);
                    }
                  }}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-arsm-muted hover:bg-arsm-toggle-bg hover:text-arsm-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:text-arsm-muted-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:text-arsm-primary-dark"
                  aria-label={isExpanded ? t('customers.collapseCustomerVehicles') : t('customers.expandCustomerVehicles')}
                  title={isExpanded ? t('customers.collapseCustomerVehicles') : t('customers.expandCustomerVehicles')}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 shrink-0 text-arsm-muted dark:text-arsm-muted-dark" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-arsm-muted dark:text-arsm-muted-dark" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isExpanded) {
                      onToggleCustomerExpanded(customer.id);
                    }
                    onOpenCustomerDetails(customer.id);
                  }}
                  className="inline-flex min-h-11 min-w-0 max-w-full items-center text-left hover:text-arsm-accent-vivid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 dark:hover:text-arsm-accent"
                >
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
                  className={`${referenceChipNeutralButtonClass} shrink-0`}
                >
                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t('customers.editCustomer')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDeleteCustomerModal(customer)}
                  className={`${referenceChipDangerButtonClass} shrink-0`}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t('customers.deleteCustomer')}</span>
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="min-w-0 px-4 pb-4 sm:px-5">
                <div className="grid min-w-0 gap-5 xl:grid-cols-2">
                  <section className="min-w-0 space-y-3">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <h3 className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                        <CarFront className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t('customers.vehiclesTitle')}</span>
                      </h3>

                      <button
                        type="button"
                        onClick={() => onOpenCreateVehicleModal(customer.id)}
                        className={`${referenceChipPrimaryButtonClass} w-full sm:w-auto`}
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t('customers.createVehicle')}</span>
                      </button>
                    </div>

                    {isLoadingVehicles && (
                      <p className="text-center text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.loadingVehicles')}</p>
                    )}

                    {!isLoadingVehicles && vehicles.length === 0 && (
                      <p className="text-center text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.emptyVehicles')}</p>
                    )}

                    {!isLoadingVehicles && vehicles.length > 0 && (
                      <div className="space-y-2">
                        {vehicles.map((vehicle) => (
                          <div key={vehicle.id}>
                            <VehicleItem
                              t={t}
                              locale={locale}
                              customerId={customer.id}
                              vehicle={vehicle}
                              onOpenEditVehicleModal={onOpenEditVehicleModal}
                              onOpenDeleteVehicleModal={onOpenDeleteVehicleModal}
                              onOpenVehicleDetails={onOpenVehicleDetails}
                              isDetailsOpen={isVehicleDetailsOpen === vehicle.id}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <CustomerDetailsPanel
                    target={detailsTargetForCustomer}
                    variant="inline"
                    locale={locale}
                    customerHistoryByCustomerId={customerHistoryByCustomerId}
                    isLoadingCustomerHistoryByCustomerId={isLoadingCustomerHistoryByCustomerId}
                    customerHistorySortByCustomerId={customerHistorySortByCustomerId}
                    vehicleHistoryByVehicleId={vehicleHistoryByVehicleId}
                    isLoadingVehicleHistoryByVehicleId={isLoadingVehicleHistoryByVehicleId}
                    vehicleHistorySortByVehicleId={vehicleHistorySortByVehicleId}
                    t={t}
                    onToggleCustomerHistorySort={onToggleCustomerHistorySort}
                    onToggleVehicleHistorySort={onToggleVehicleHistorySort}
                    onOpenHistoryAppointment={onOpenHistoryAppointment}
                  />
                </div>
              </div>
            )}
          </article>
        );
      })}

      {!isLoadingCustomers && filteredCustomers.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 py-2 text-center text-xs uppercase tracking-[0.18em] text-arsm-muted dark:text-arsm-muted-dark">
          <div className="h-px flex-1 bg-arsm-border dark:bg-arsm-border-dark" />
          <span className="min-w-0 basis-full break-words text-center sm:basis-auto">{t('customers.endOfList')}</span>
          <div className="h-px flex-1 bg-arsm-border dark:bg-arsm-border-dark" />
        </div>
      )}
    </section>
  );
});

CustomerListSectionComponent.displayName = 'CustomerListSection';
export const CustomerListSection = CustomerListSectionComponent;