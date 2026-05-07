import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, Plus, Search, X } from 'lucide-react';
import { cardClass } from '../../../utils/formStyles';
import { filterNameInput } from '../../../utils/validation';

type SortDirection = 'asc' | 'desc';
type CustomerSortField = 'name';

interface CustomersToolbarProps {
	t: TFunction;
	searchTerm: string;
	sortField: CustomerSortField;
	sortDirection: SortDirection;
	onSearchChange: (value: string) => void;
	onClearSearch: () => void;
	onSortFieldChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
	onToggleSortDirection: () => void;
	onOpenCreateCustomerModal: () => void;
}

const CustomersToolbarComponent = memo(function CustomersToolbar({
	t,
	searchTerm,
	sortField,
	sortDirection,
	onSearchChange,
	onClearSearch,
	onSortFieldChange,
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
							<X className="h-4 w-4" />
						</button>
					)}
				</div>

				<div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
					<label htmlFor="customers-sort-field" className="sr-only">
						{t('customers.sortBy')}
					</label>
					<div className="min-w-0 flex-1 overflow-hidden max-[350px]:basis-full sm:flex-none">
						<select
							id="customers-sort-field"
							data-testid="customers-sort-field-select"
							value={sortField}
							onChange={onSortFieldChange}
							aria-label={t('customers.sortBy')}
							className="w-full min-w-0 max-w-full truncate rounded-xl border border-arsm-border bg-arsm-toggle-bg px-3 py-2 text-sm font-medium text-arsm-label focus:border-arsm-accent dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark"
						>
							<option value="name">{t('customers.sortFieldName')}</option>
						</select>
					</div>

					<button
						data-testid="customers-sort-toggle"
						type="button"
						onClick={onToggleSortDirection}
						className="inline-flex min-w-0 max-w-full flex-1 items-center justify-center gap-1 rounded-xl border border-arsm-border bg-arsm-toggle-bg px-3 py-2 text-sm font-medium text-arsm-label transition hover:-translate-y-px hover:bg-arsm-accent-subtle max-[350px]:basis-full dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark sm:flex-none"
					>
						<ArrowUpDown className="h-4 w-4 shrink-0" />
						<span className="truncate">{sortDirection === 'asc' ? t('customers.sortDirectionAsc') : t('customers.sortDirectionDesc')}</span>
					</button>

					<button
						data-testid="customers-create-button"
						type="button"
						onClick={onOpenCreateCustomerModal}
						className="inline-flex min-w-0 max-w-full flex-1 items-center justify-center gap-1 rounded-xl bg-arsm-accent px-3 py-2 text-sm font-semibold text-arsm-on-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover max-[350px]:basis-full dark:bg-arsm-accent-dark dark:text-arsm-on-accent-dark dark:hover:bg-arsm-accent-dark-hover sm:flex-none"
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