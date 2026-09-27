/**
 * Mechanic list toolbar: name search and sort-direction toggle.
 * @module pages/Admin/RegisterMechanic/sections/MechanicListToolbar
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, Search, X } from 'lucide-react';
import {
	defaultIconClass,
	inputGroupContainerClass,
	inputGroupIconClass,
	referenceChipNeutralButtonClass,
	searchClearButtonClass,
	searchInputClass,
	toolbarActionsWrapperClass,
	toolbarRowLayoutClass,
} from '../../../../utils/formStyles';
import { filterNameInput } from '../../../../utils/validation';
import type { SortDirection } from '../types';

interface MechanicListToolbarProps {
	readonly t: TFunction;
	readonly searchTerm: string;
	readonly sortDirection: SortDirection;
	readonly onSearchChange: (value: string) => void;
	readonly onClearSearch: () => void;
	readonly onToggleSortDirection: () => void;
}

const MechanicListToolbarComponent = memo(function MechanicListToolbar({
	t,
	searchTerm,
	sortDirection,
	onSearchChange,
	onClearSearch,
	onToggleSortDirection,
}: MechanicListToolbarProps) {
	return (
		<div className={toolbarRowLayoutClass}>
			<div className={`${inputGroupContainerClass} w-full sm:max-w-md`}>
				<Search className={inputGroupIconClass} />
				<input
					data-testid="mechanic-search-input"
					type="text"
					value={searchTerm}
					onChange={(event) => onSearchChange(filterNameInput(event.target.value))}
					placeholder={t('admin.mechanicSearchPlaceholder')}
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

			<div className={toolbarActionsWrapperClass}>
				<button
					data-testid="mechanic-sort-toggle"
					type="button"
					onClick={onToggleSortDirection}
					className={`${referenceChipNeutralButtonClass} flex-1 sm:flex-none`}
				>
					<ArrowUpDown className={defaultIconClass} />
					<span className="truncate">{sortDirection === 'asc' ? t('common.sort.ascending') : t('common.sort.descending')}</span>
				</button>
			</div>
		</div>
	);
});

MechanicListToolbarComponent.displayName = 'MechanicListToolbar';
export const MechanicListToolbar = MechanicListToolbarComponent;
