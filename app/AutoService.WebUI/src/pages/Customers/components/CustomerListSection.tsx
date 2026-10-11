/** Customer list section: expandable vehicle/history details, search highlighting, and CRUD operations. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import {
  centeredLoadingWrapperClass,
  compactDividerLineClass,
  emptyStateBoxClass,
  loadingSpinnerClass,
  uppercaseMetaLabelTextClass,
} from '../../../utils/formStyles';
import { CustomerCard } from './CustomerCard';
import type { CustomerHistoryState, CustomerListActions, CustomerListData } from './customerListSection.types';

interface CustomerListSectionProps {
  readonly t: TFunction;
  readonly data: CustomerListData;
  readonly actions: CustomerListActions;
  readonly history: CustomerHistoryState;
}

/** Renders the loading, empty or filtered customer card list, closed by an end-of-list divider. */
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
    detailsTarget,
    locale,
  } = data;

  return (
    <section className="space-y-3">
      {isLoadingCustomers && (
        <div className={centeredLoadingWrapperClass}>
          <div className={`h-8 w-8 ${loadingSpinnerClass}`} />
        </div>
      )}

      {!isLoadingCustomers && filteredCustomers.length === 0 && (
        <p className={emptyStateBoxClass}>
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
          detailsTarget={detailsTarget?.customerId === customer.id ? detailsTarget : null}
          locale={locale}
          actions={actions}
          history={history}
        />
      ))}

      {!isLoadingCustomers && filteredCustomers.length > 0 && (
        <div className={`flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 py-2 text-center ${uppercaseMetaLabelTextClass}`}>
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