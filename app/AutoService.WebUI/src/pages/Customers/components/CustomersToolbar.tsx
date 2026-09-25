/**
 * Customers page toolbar: search input, sort direction toggle, and create-customer action.
 * @module CustomersToolbar
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, Plus, Search, X } from 'lucide-react';
import {
	cardClass,
	defaultIconClass,
	inputGroupContainerClass,
	inputGroupIconClass,
	referenceChipNeutralButtonClass,
	referenceChipPrimaryButtonClass,
	searchClearButtonClass,
	searchInputClass,
	toolbarActionsWrapperClass,
	toolbarRowLayoutClass,
} from '../../../utils/formStyles';
import { filterNameInput } from '../../../utils/validation';
import type { SortDirection } from '../page.types';

interface CustomersToolbarProps {
	t: TFunction;
	searchTerm: string;
	sortDirection: SortDirection;
	onSearchChange: (value: string) => void;
	onClearSearch: () => void;
	onToggleSortDirection: () => void;
	onOpenCreateCustomerModal: () => void;
}

const CustomersToolbarComponent = memo(function CustomersToolbar({
	t,
	searchTerm,
	sortDirection,
	onSearchChange,
	onClearSearch,
	onToggleSortDirection,
	onOpenCreateCustomerModal,
}: CustomersToolbarProps) {
	return (
		<section className={cardClass}>
			<div className={toolbarRowLayoutClass}>
				<div className={`${inputGroupContainerClass} w-full sm:max-w-md`}>
					<Search className={inputGroupIconClass} />
					<input
						data-testid="customers-search-input"
						type="text"
						value={searchTerm}
						onChange={(event) => onSearchChange(filterNameInput(event.target.value))}
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
						data-testid="customers-sort-toggle"
						type="button"
						onClick={onToggleSortDirection}
						className={`${referenceChipNeutralButtonClass} flex-1 sm:flex-none`}
					>
						<ArrowUpDown className={defaultIconClass} />
						<span className="truncate">{sortDirection === 'asc' ? t('common.sort.ascending') : t('common.sort.descending')}</span>
					</button>

					<button
						data-testid="customers-create-button"
						type="button"
						onClick={onOpenCreateCustomerModal}
						className={`${referenceChipPrimaryButtonClass} flex-1 sm:flex-none`}
					>
						<Plus className={defaultIconClass} />
						<span className="truncate">{t('customers.createCustomer')}</span>
					</button>
				</div>
			</div>
		</section>
	);
});

CustomersToolbarComponent.displayName = 'CustomersToolbar';
export const CustomersToolbar = CustomersToolbarComponent;