/** Customers page toolbar: search input and create-customer action. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Plus, Search, X } from 'lucide-react';
import {
  cardClass,
  defaultIconClass,
  inputGroupContainerClass,
  inputGroupIconClass,
  referenceChipPrimaryButtonClass,
  searchClearButtonClass,
  searchInputClass,
  toolbarActionGrowClass,
  toolbarActionsWrapperClass,
  toolbarRowLayoutClass,
  toolbarSearchFieldClass,
} from '../../../utils/formStyles';
import { filterNameSearchInput } from '../../../utils/validation';

interface CustomersToolbarProps {
  t: TFunction;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenCreateCustomerModal: () => void;
}

/** Renders the search field with its clear button and the create-customer button. */
const CustomersToolbarComponent = memo(function CustomersToolbar({
  t,
  searchTerm,
  onSearchChange,
  onClearSearch,
  onOpenCreateCustomerModal,
}: CustomersToolbarProps) {
  return (
    <section className={cardClass}>
      <div className={toolbarRowLayoutClass}>
        <div className={`${inputGroupContainerClass} ${toolbarSearchFieldClass}`}>
          <Search className={inputGroupIconClass} />
          <input
            data-testid="customers-search-input"
            type="text"
            value={searchTerm}
            onChange={(event) => {
              onSearchChange(filterNameSearchInput(event.target.value));
            }}
            placeholder={t('customers.searchPlaceholder')}
            className={searchInputClass}
          />
          {searchTerm.length > 0 && (
            <button
              data-testid="customers-search-clear"
              type="button"
              onClick={onClearSearch}
              title={t('common.actions.clearSearch')}
              aria-label={t('common.actions.clearSearch')}
              className={searchClearButtonClass}
            >
              <X className={defaultIconClass} aria-hidden="true" />
            </button>
          )}
        </div>

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

CustomersToolbarComponent.displayName = 'CustomersToolbar';
export const CustomersToolbar = CustomersToolbarComponent;