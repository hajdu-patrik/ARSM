/** Quotes toolbar: search plus status filter; Expired sits beside the four stored statuses since that's what a mechanic looks for. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Search, X } from 'lucide-react';
import { Dropdown } from '../../../components/common/Dropdown';
import {
  cardClass,
  defaultIconClass,
  inputGroupContainerClass,
  inputGroupIconClass,
  searchClearButtonClass,
  searchInputClass,
  toolbarRowLayoutClass,
  toolbarSearchFieldClass,
} from '../../../utils/formStyles';
import { isQuoteStatusFilter, QUOTE_STATUS_FILTERS, type QuoteStatusFilter } from '../helpers';

interface QuotesToolbarProps {
  readonly t: TFunction;
  readonly searchTerm: string;
  readonly statusFilter: QuoteStatusFilter;
  readonly onSearchChange: (value: string) => void;
  readonly onClearSearch: () => void;
  readonly onStatusFilterChange: (value: QuoteStatusFilter) => void;
}

/** i18n key for each toolbar status filter option. */
const STATUS_FILTER_I18N_KEY: Record<QuoteStatusFilter, string> = {
  All: 'quotes.filters.all',
  Draft: 'quotes.status.draft',
  Sent: 'quotes.status.sent',
  Expired: 'quotes.status.expired',
  Accepted: 'quotes.status.accepted',
  Rejected: 'quotes.status.rejected',
};

export const QuotesToolbar = memo(function QuotesToolbar({
  t,
  searchTerm,
  statusFilter,
  onSearchChange,
  onClearSearch,
  onStatusFilterChange,
}: QuotesToolbarProps) {
  const statusOptions = QUOTE_STATUS_FILTERS.map((filter) => ({ value: filter, label: t(STATUS_FILTER_I18N_KEY[filter]) }));

  return (
    <section className={cardClass}>
      <div className={toolbarRowLayoutClass}>
        <div className={`${inputGroupContainerClass} ${toolbarSearchFieldClass}`}>
          <Search className={inputGroupIconClass} />
          <input
            data-testid="quotes-search-input"
            type="text"
            value={searchTerm}
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
            placeholder={t('quotes.searchPlaceholder')}
            className={searchInputClass}
          />
          {searchTerm.length > 0 && (
            <button
              data-testid="quotes-search-clear"
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

        <div className="min-w-0 max-w-full w-full sm:w-56 sm:shrink-0">
          <Dropdown
            data-testid="quotes-status-filter"
            value={statusFilter}
            ariaLabel={t('quotes.filters.statusLabel')}
            options={statusOptions}
            onChange={(value) => {
              if (isQuoteStatusFilter(value)) {
                onStatusFilterChange(value);
              }
            }}
          />
        </div>
      </div>
    </section>
  );
});
