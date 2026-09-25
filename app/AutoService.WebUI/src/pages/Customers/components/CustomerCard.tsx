/**
 * Expandable customer card with vehicle and detail panels.
 * @module pages/Customers/components/CustomerCard
 */

import { memo } from 'react';
import type { TFunction } from 'i18next';
import { CarFront, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import {
  baseSectionHeadingTextClass,
  compactChipPrimaryButtonClass,
  compactHeaderRowClass,
  contentCardFrameClass,
  defaultIconClass,
  inlineSectionTitleClass,
  metadataPillClass,
  mutedMetaTextClass,
  mutedSecondaryTextClass,
  mutedSectionIconClass,
  referenceChipDangerButtonClass,
  referenceChipNeutralButtonClass,
  rowIconActionNeutralClass,
  smallIconClass,
} from '../../../utils/formStyles';
import { buildCustomerDisplayName } from '../helpers';
import { CustomerDetailsPanel, type ResolvedCustomerDetailsPanelTarget } from './CustomerDetailsPanel';
import { VehicleItem } from './VehicleItem';
import type { CustomerHistoryState, CustomerListActions } from './customerListSection.types';

interface CustomerCardProps {
  readonly t: TFunction;
  readonly searchTerm: string;
  readonly customer: CustomerListItem;
  readonly isExpanded: boolean;
  readonly vehicles: VehicleDetailDto[];
  readonly isLoadingVehicles: boolean;
  readonly activeTarget: ResolvedCustomerDetailsPanelTarget | null;
  readonly locale: string;
  readonly actions: CustomerListActions;
  readonly history: CustomerHistoryState;
}

function renderHighlightedCustomerName(fullName: string, searchTerm: string) {
  const trimmedSearchTerm = searchTerm.trim();
  if (trimmedSearchTerm.length === 0) {
    return fullName;
  }

  const escapedSearch = trimmedSearchTerm.replaceAll(/[-/\\^$*+?.()|[\]{}]/g, String.raw`\$&`);
  const highlightRegex = new RegExp(`(${escapedSearch})`, 'ig');

  return fullName.split(highlightRegex).map((part, index) => {
    if (part.length > 0 && part.toLowerCase() === trimmedSearchTerm.toLowerCase()) {
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
}

/** Renders a single customer card and its expanded vehicle/detail content. */
const CustomerCardComponent = memo(function CustomerCard({
  t,
  searchTerm,
  customer,
  isExpanded,
  vehicles,
  isLoadingVehicles,
  activeTarget,
  locale,
  actions,
  history,
}: CustomerCardProps) {
  const {
    onToggleCustomerExpanded,
    onOpenCustomerDetails,
    onOpenEditCustomerModal,
    onOpenDeleteCustomerModal,
    onOpenCreateVehicleModal,
    onOpenEditVehicleModal,
    onOpenDeleteVehicleModal,
    onOpenVehicleDetails,
    onCreateQuoteForVehicle,
  } = actions;
  const {
    customerHistoryByCustomerId,
    isLoadingCustomerHistoryByCustomerId,
    customerHistorySortByCustomerId,
    vehicleHistoryByVehicleId,
    isLoadingVehicleHistoryByVehicleId,
    vehicleHistorySortByVehicleId,
    onToggleCustomerHistorySort,
    onToggleVehicleHistorySort,
    onOpenHistoryAppointment,
  } = history;
  const detailsTarget: ResolvedCustomerDetailsPanelTarget = activeTarget ?? {
    kind: 'customer',
    customer,
  };
  const isVehicleDetailsOpen = activeTarget?.kind === 'vehicle' ? activeTarget.vehicle.id : null;

  return (
    <article
      data-testid={`customer-card-${customer.id}`}
      className={`min-w-0 duration-200 ${contentCardFrameClass}`}
    >
      <div className="flex min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <h2 className={`flex min-w-0 items-center gap-2 ${baseSectionHeadingTextClass}`}>
          <button
            data-testid={`customer-expand-${customer.id}`}
            type="button"
            onClick={() => {
              onToggleCustomerExpanded(customer.id);
              if (!isExpanded) {
                onOpenCustomerDetails(customer.id);
              }
            }}
            className={rowIconActionNeutralClass}
            aria-label={isExpanded ? t('customers.collapseCustomerVehicles') : t('customers.expandCustomerVehicles')}
            title={isExpanded ? t('customers.collapseCustomerVehicles') : t('customers.expandCustomerVehicles')}
          >
            {isExpanded ? <ChevronDown className={mutedSectionIconClass} /> : <ChevronRight className={mutedSectionIconClass} />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isExpanded) {
                onToggleCustomerExpanded(customer.id);
              }
              onOpenCustomerDetails(customer.id);
            }}
            className="inline-flex min-h-11 min-w-11 max-w-full items-center text-left hover:text-arsm-accent-vivid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 dark:hover:text-arsm-accent"
          >
            <span className="min-w-0 truncate">{renderHighlightedCustomerName(buildCustomerDisplayName(customer), searchTerm)}</span>
          </button>
        </h2>

        <div className={`flex min-w-0 flex-wrap items-center gap-2 ${mutedMetaTextClass}`}>
          <span className={metadataPillClass}>{customer.email}</span>
          {customer.phoneNumber && <span className={metadataPillClass}>{customer.phoneNumber}</span>}
          <span className={metadataPillClass}>
            {t('common.fields.vehicleCount', { count: customer.vehicleCount })}
          </span>
          <button type="button" onClick={() => onOpenEditCustomerModal(customer)} className={referenceChipNeutralButtonClass}>
            <Pencil className={defaultIconClass} />
            <span className="truncate">{t('customers.editCustomer')}</span>
          </button>
          <button type="button" onClick={() => onOpenDeleteCustomerModal(customer)} className={referenceChipDangerButtonClass}>
            <Trash2 className={defaultIconClass} />
            <span className="truncate">{t('customers.deleteCustomer')}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="min-w-0 border-t border-arsm-border/85 px-4 pb-4 pt-4 dark:border-arsm-border-dark/85 sm:px-5">
          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            <section className="min-w-0 space-y-3">
              <div className={compactHeaderRowClass}>
                <h3 className={inlineSectionTitleClass}>
                  <CarFront className={defaultIconClass} />
                  <span className="truncate">{t('customers.vehiclesTitle')}</span>
                </h3>
                <button type="button" onClick={() => onOpenCreateVehicleModal(customer.id)} className={`${compactChipPrimaryButtonClass} w-full sm:w-auto`}>
                  <Plus className={smallIconClass} />
                  <span className="truncate">{t('customers.createVehicle')}</span>
                </button>
              </div>

              {isLoadingVehicles && <p className={`text-center ${mutedSecondaryTextClass}`}>{t('customers.loadingVehicles')}</p>}
              {!isLoadingVehicles && vehicles.length === 0 && <p className={`text-center ${mutedSecondaryTextClass}`}>{t('customers.emptyVehicles')}</p>}
              {!isLoadingVehicles && vehicles.length > 0 && (
                <div className="min-w-0 divide-y divide-arsm-border/80 dark:divide-arsm-border-dark/80">
                  {vehicles.map((vehicle) => (
                    <VehicleItem
                      key={vehicle.id}
                      t={t}
                      locale={locale}
                      customerId={customer.id}
                      vehicle={vehicle}
                      onOpenEditVehicleModal={onOpenEditVehicleModal}
                      onOpenDeleteVehicleModal={onOpenDeleteVehicleModal}
                      onOpenVehicleDetails={onOpenVehicleDetails}
                      onCreateQuoteForVehicle={onCreateQuoteForVehicle}
                      isDetailsOpen={isVehicleDetailsOpen === vehicle.id}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="min-w-0 border-t border-arsm-border/65 pt-4 dark:border-arsm-border-dark/65 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <CustomerDetailsPanel
                target={detailsTarget}
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
        </div>
      )}
    </article>
  );
});

CustomerCardComponent.displayName = 'CustomerCard';

export const CustomerCard = CustomerCardComponent;
