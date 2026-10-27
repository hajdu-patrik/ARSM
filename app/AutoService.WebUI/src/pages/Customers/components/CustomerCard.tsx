/** Expandable customer card: name and contact header; the vehicle and history details load once it is expanded. */

import { memo, useId } from 'react';
import type { TFunction } from 'i18next';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { HighlightedText } from '../../../components/common/HighlightedText';
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

export const CustomerCard = memo(function CustomerCard({
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
      data-expanded={isExpanded}
      className={`min-w-0 duration-200 ${contentCardFrameClass}`}
    >
      {/* Phone: name and its actions share the first line, the pills wrap below; lg: one line, with the actions after the pills. */}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 px-4 py-4 sm:px-5 lg:flex lg:flex-wrap lg:items-center">
        <h2 className={`flex min-w-0 items-center ${baseSectionHeadingTextClass} lg:mr-auto`}>
          <button
            data-testid={`customer-expand-${String(customer.id)}`}
            type="button"
            onClick={() => {
              onToggleCustomerExpanded(customer.id);
              if (!isExpanded) {
                onOpenCustomerDetails(customer.id);
              }
            }}
            className={`${rowIconActionNeutralClass} -ml-3`}
            aria-expanded={isExpanded}
            aria-controls={isExpanded ? detailsRegionId : undefined}
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
            <HighlightedText
              className="min-w-0 [overflow-wrap:anywhere]"
              text={buildCustomerDisplayName(customer)}
              query={searchTerm}
            />
          </button>
        </h2>

        <div className={`${compactRowActionsClusterClass} lg:order-last`}>
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
          {onOpenDeleteCustomerModal !== undefined && (
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
          )}
        </div>

        <div className={`col-span-2 flex min-w-0 flex-wrap items-center gap-2 ${mutedMetaTextClass}`}>
          <span className={metadataPillWrapClass}>{customer.email}</span>
          {customer.phoneNumber && <span className={metadataPillWrapClass}>{customer.phoneNumber}</span>}
          <span className={metadataPillWrapClass}>
            {t('common.fields.vehicleCount', { count: customer.vehicleCount })}
          </span>
        </div>
      </div>

      {isExpanded && (
        <CustomerCardDetails
          id={detailsRegionId}
          t={t}
          customer={customer}
          searchTerm={searchTerm}
          detailsTarget={detailsTarget}
          locale={locale}
          actions={actions}
          history={history}
        />
      )}
    </article>
  );
});
