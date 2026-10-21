/** Mechanic list toolbar: the search field. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ToolbarSearchField } from '../../../../components/common/ToolbarSearchField';
import { toolbarRowLayoutClass } from '../../../../utils/formStyles';
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
			<ToolbarSearchField
				testIdPrefix="mechanic"
				value={searchTerm}
				placeholder={t('admin.mechanicSearchPlaceholder')}
				ariaLabel={t('admin.mechanicSearchPlaceholder')}
				onChange={(value) => { onSearchChange(filterNameSearchInput(value)); }}
				onClear={onClearSearch}
			/>
		</div>
	);
});
