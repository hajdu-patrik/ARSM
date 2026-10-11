/** Expandable customer card: name and contact header; the vehicle and history details load once it is expanded. */

import { memo, useId } from 'react';
import type { TFunction } from 'i18next';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { CustomerListItem } from '../../../types/customers/customers.types';
import {
  baseSectionHeadingTextClass,
  compactRowActionsClusterClass,
  contentCardFrameClass,
  focusVisibleOutlineClass,
  metadataPillWrapClass,
  mutedMetaTextClass,
  mutedSectionIconClass,
  rowIconActionDangerClass,
  rowIconActionNeutralClass,
  rowIconActionWarningClass,
  smallIconClass,
} from '../../../utils/formStyles';
import type { CustomerDetailsPanelTarget } from '../hooks/useCustomerDetailsPanel';
import { buildCustomerDisplayName } from '../helpers';
import { CustomerCardDetails } from './CustomerCardDetails';
import type { CustomerHistoryState, CustomerListActions } from './customerListSection.types';

interface CustomerCardProps {
  readonly t: TFunction;
  readonly searchTerm: string;
  readonly customer: CustomerListItem;
  readonly isExpanded: boolean;
  readonly detailsTarget: CustomerDetailsPanelTarget | null;
  readonly locale: string;
  readonly actions: CustomerListActions;
  readonly history: CustomerHistoryState;
}

/** Splits the name around case-insensitive matches of the trimmed search term and marks each match. */
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
          key={`${part}-${String(index)}`}
          className="rounded border border-arsm-accent/55 bg-ui-accent px-0.5 font-semibold text-arsm-primary dark:border-arsm-accent-dark/65"
        >
          {part}
        </mark>
      );
    }

    return <span key={`${part}-${String(index)}`}>{part}</span>;
  });
}

/** Renders a single customer card and, once expanded, its vehicle and history details. */
const CustomerCardComponent = memo(function CustomerCard({
  t,
  searchTerm,
  customer,
  isExpanded,
  detailsTarget,
  locale,
  actions,
  history,
}: CustomerCardProps) {
  const detailsRegionId = useId();
  const {
    onToggleCustomerExpanded,
    onOpenCustomerDetails,
    onOpenEditCustomerModal,
    onOpenDeleteCustomerModal,
  } = actions;
  const expandLabel = isExpanded ? t('customers.collapseCustomerVehicles') : t('customers.expandCustomerVehicles');
  const editCustomerLabel = t('customers.editCustomer');
  const deleteCustomerLabel = t('customers.deleteCustomer');

  return (
    <article
      data-testid={`customer-card-${String(customer.id)}`}
      className={`min-w-0 duration-200 ${contentCardFrameClass}`}
    >
      <div className="flex min-w-0 flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <h2 className={`flex min-w-0 items-center gap-2 ${baseSectionHeadingTextClass}`}>
          <button
            data-testid={`customer-expand-${String(customer.id)}`}
            type="button"
            onClick={() => {
              onToggleCustomerExpanded(customer.id);
              if (!isExpanded) {
                onOpenCustomerDetails(customer.id);
              }
            }}
            className={rowIconActionNeutralClass}
            aria-expanded={isExpanded}
            aria-controls={detailsRegionId}
            aria-label={expandLabel}
            title={expandLabel}
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
            className={`inline-flex min-h-11 min-w-11 max-w-full items-center text-left hover:text-arsm-accent-vivid dark:hover:text-arsm-accent ${focusVisibleOutlineClass}`}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{renderHighlightedCustomerName(buildCustomerDisplayName(customer), searchTerm)}</span>
          </button>
        </h2>

        <div className={`flex min-w-0 flex-wrap items-center gap-2 ${mutedMetaTextClass}`}>
          <span className={metadataPillWrapClass}>{customer.email}</span>
          {customer.phoneNumber && <span className={metadataPillWrapClass}>{customer.phoneNumber}</span>}
          <span className={metadataPillWrapClass}>
            {t('common.fields.vehicleCount', { count: customer.vehicleCount })}
          </span>
          <div className={compactRowActionsClusterClass}>
            <button
              type="button"
              onClick={() => {
                onOpenEditCustomerModal(customer);
              }}
              className={rowIconActionWarningClass}
              title={editCustomerLabel}
              aria-label={editCustomerLabel}
            >
              <Pencil className={smallIconClass} />
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenDeleteCustomerModal(customer);
              }}
              className={rowIconActionDangerClass}
              title={deleteCustomerLabel}
              aria-label={deleteCustomerLabel}
            >
              <Trash2 className={smallIconClass} />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <CustomerCardDetails
          id={detailsRegionId}
          t={t}
          customer={customer}
          detailsTarget={detailsTarget}
          locale={locale}
          actions={actions}
          history={history}
        />
      )}
    </article>
  );
});

CustomerCardComponent.displayName = 'CustomerCard';

export const CustomerCard = CustomerCardComponent;
