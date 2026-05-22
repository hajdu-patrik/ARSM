/**
 * Customer list section with expandable vehicle and history details.
 * Manages customer cards, vehicle lists, repair history, and search highlighting.
 * Handles multi-vehicle visual separation and CRUD operations.
 * @module CustomerListSection
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import {
  compactDividerLineClass,
  loadingSpinnerClass,
  mutedDarkCardToneClass,
} from '../../../utils/formStyles';
import { CustomerCard } from './CustomerCard';
import type { CustomerHistoryState, CustomerListActions, CustomerListData } from './customerListSection.types';

interface CustomerListSectionProps {
  readonly t: TFunction;
  readonly data: CustomerListData;
  readonly actions: CustomerListActions;
  readonly history: CustomerHistoryState;
}

const CustomerListSectionComponent = memo(function CustomerListSection({
  t,
  data,
  actions,
  history,
}: CustomerListSectionProps) {
  const {
    searchTerm,
    filteredCustomers,
    isLoadingCustomers,
    expandedCustomerIds,
    vehiclesByCustomerId,
    isLoadingVehiclesByCustomerId,
    resolvedDetailsTarget,
    locale,
  } = data;

  return (
    <section className="space-y-3">
      {isLoadingCustomers && (
        <div className="flex min-w-0 items-center justify-center py-12">
          <div className={`h-8 w-8 ${loadingSpinnerClass}`} />
        </div>
      )}

      {!isLoadingCustomers && filteredCustomers.length === 0 && (
        <p className={`rounded-2xl border border-dashed border-arsm-border bg-arsm-input px-4 py-12 text-center text-sm ${mutedDarkCardToneClass}`}>
          {t('customers.empty')}
        </p>
      )}

      {!isLoadingCustomers && filteredCustomers.map((customer) => (
        <CustomerCard
          key={customer.id}
          t={t}
          searchTerm={searchTerm}
          customer={customer}
          isExpanded={expandedCustomerIds.has(customer.id)}
          vehicles={vehiclesByCustomerId[customer.id] ?? []}
          isLoadingVehicles={isLoadingVehiclesByCustomerId[customer.id] ?? false}
          activeTarget={resolvedDetailsTarget?.customer.id === customer.id ? resolvedDetailsTarget : null}
          locale={locale}
          actions={actions}
          history={history}
        />
      ))}

      {!isLoadingCustomers && filteredCustomers.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 py-2 text-center text-xs uppercase tracking-[0.18em] text-arsm-muted dark:text-arsm-muted-dark">
          <div className={compactDividerLineClass} />
          <span className="min-w-0 basis-full break-words text-center sm:basis-auto">{t('customers.endOfList')}</span>
          <div className={compactDividerLineClass} />
        </div>
      )}
    </section>
  );
});

CustomerListSectionComponent.displayName = 'CustomerListSection';
export const CustomerListSection = CustomerListSectionComponent;