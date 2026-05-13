import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, Plus, Search, X } from 'lucide-react';
import {
	cardClass,
	customersToolbarNeutralButtonClass,
	customersToolbarPrimaryButtonClass,
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
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative w-full sm:max-w-md">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-arsm-muted dark:text-arsm-muted-dark" />
					<input
						data-testid="customers-search-input"
						type="text"
						value={searchTerm}
						onChange={(event) => onSearchChange(filterNameInput(event.target.value))}
						placeholder={t('customers.searchPlaceholder')}
						className="w-full rounded-xl border border-arsm-border bg-arsm-input py-2 pl-9 pr-10 text-sm text-arsm-primary focus:border-arsm-accent focus:outline-none dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark"
					/>
					{searchTerm.length > 0 && (
						<button
							data-testid="customers-search-clear"
							type="button"
							onClick={onClearSearch}
							title={t('customers.clearSearch')}
							className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-arsm-label transition hover:bg-arsm-toggle-bg dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
						>
							<X className="h-4 w-4" aria-hidden="true" />
						</button>
					)}
				</div>

				<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
					<button
						data-testid="customers-sort-toggle"
						type="button"
						onClick={onToggleSortDirection}
						className={`${customersToolbarNeutralButtonClass} flex-1 sm:flex-none`}
					>
						<ArrowUpDown className="h-4 w-4 shrink-0" />
						<span className="truncate">{sortDirection === 'asc' ? t('customers.sortDirectionAsc') : t('customers.sortDirectionDesc')}</span>
					</button>

					<button
						data-testid="customers-create-button"
						type="button"
						onClick={onOpenCreateCustomerModal}
						className={`${customersToolbarPrimaryButtonClass} flex-1 sm:flex-none`}
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