/** Mechanic list toolbar: the search field. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Search, X } from 'lucide-react';
import {
	defaultIconClass,
	inputGroupContainerClass,
	inputGroupIconClass,
	searchClearButtonClass,
	searchInputClass,
	toolbarRowLayoutClass,
	toolbarSearchFieldClass,
} from '../../../../utils/formStyles';
import { filterNameSearchInput } from '../../../../utils/validation';

interface MechanicListToolbarProps {
	readonly t: TFunction;
	readonly searchTerm: string;
	readonly onSearchChange: (value: string) => void;
	readonly onClearSearch: () => void;
}

/** Search field with a clear button above the mechanic roster. */
export const MechanicListToolbar = memo(function MechanicListToolbar({
	t,
	searchTerm,
	onSearchChange,
	onClearSearch,
}: MechanicListToolbarProps) {
	return (
		<div className={toolbarRowLayoutClass}>
			<div className={`${inputGroupContainerClass} ${toolbarSearchFieldClass}`}>
				<Search className={inputGroupIconClass} aria-hidden="true" />
				<input
					data-testid="mechanic-search-input"
					type="text"
					value={searchTerm}
					onChange={(event) => {
						onSearchChange(filterNameSearchInput(event.target.value));
					}}
					placeholder={t('admin.mechanicSearchPlaceholder')}
					aria-label={t('admin.mechanicSearchPlaceholder')}
					className={searchInputClass}
				/>
				{searchTerm.length > 0 && (
					<button
						data-testid="mechanic-search-clear"
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
		</div>
	);
});
