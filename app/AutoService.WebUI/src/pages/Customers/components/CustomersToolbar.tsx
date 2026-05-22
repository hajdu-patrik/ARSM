import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, Plus, Search, X } from 'lucide-react';
import {
	cardClass,
	inputGroupContainerClass,
	inputGroupIconClass,
	referenceChipNeutralButtonClass,
	referenceChipPrimaryButtonClass,
	searchClearButtonClass,
	searchInputClass,
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
			<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
							title={t('customers.clearSearch')}
							className={searchClearButtonClass}
						>
							<X className="h-4 w-4" aria-hidden="true" />
						</button>
					)}
				</div>

				<div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
					<button
						data-testid="customers-sort-toggle"
						type="button"
						onClick={onToggleSortDirection}
						className={`${referenceChipNeutralButtonClass} flex-1 sm:flex-none`}
					>
						<ArrowUpDown className="h-4 w-4 shrink-0" />
						<span className="truncate">{sortDirection === 'asc' ? t('customers.sortDirectionAsc') : t('customers.sortDirectionDesc')}</span>
					</button>

					<button
						data-testid="customers-create-button"
						type="button"
						onClick={onOpenCreateCustomerModal}
						className={`${referenceChipPrimaryButtonClass} flex-1 sm:flex-none`}
					>
						<Plus className="h-4 w-4 shrink-0" />
						<span className="truncate">{t('customers.createCustomer')}</span>
					</button>
				</div>
			</div>
		</section>
	);
});

CustomersToolbarComponent.displayName = 'CustomersToolbar';
export const CustomersToolbar = CustomersToolbarComponent;