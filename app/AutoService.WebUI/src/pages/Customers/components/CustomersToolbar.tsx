/** Customers page toolbar: search input and create-customer action. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Plus } from 'lucide-react';
import { ToolbarSearchField } from '../../../components/common/ToolbarSearchField';
import {
  cardClass,
  defaultIconClass,
  referenceChipPrimaryButtonClass,
  toolbarActionGrowClass,
  toolbarActionsWrapperClass,
  toolbarRowLayoutClass,
} from '../../../utils/formStyles';
import { filterNameSearchInput } from '../../../utils/validation';

interface CustomersToolbarProps {
  t: TFunction;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenCreateCustomerModal: () => void;
}

export const CustomersToolbar = memo(function CustomersToolbar({
  t,
  searchTerm,
  onSearchChange,
  onClearSearch,
  onOpenCreateCustomerModal,
}: CustomersToolbarProps) {
  return (
    <section className={cardClass}>
      <div className={toolbarRowLayoutClass}>
        <ToolbarSearchField
          testIdPrefix="customers"
          value={searchTerm}
          placeholder={t('customers.searchPlaceholder')}
          onChange={(value) => { onSearchChange(filterNameSearchInput(value)); }}
          onClear={onClearSearch}
        />

        <div className={toolbarActionsWrapperClass}>
          <button
            data-testid="customers-create-button"
            type="button"
            onClick={onOpenCreateCustomerModal}
            className={`${referenceChipPrimaryButtonClass} ${toolbarActionGrowClass}`}
          >
            <Plus className={defaultIconClass} />
            <span>{t('customers.createCustomer')}</span>
          </button>
        </div>
      </div>
    </section>
  );
});
