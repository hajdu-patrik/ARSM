/**
 * Inventory page placeholder.
 * Renders a coming-soon panel for inventory management.
 * @module pages/Inventory/page
 */
import { memo } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
	comingSoonCardClass,
	comingSoonDescriptionClass,
	comingSoonDividerClass,
	comingSoonIconClass,
	comingSoonIconBadgeClass,
	comingSoonSheenClass,
	comingSoonTitleClass,
	pageShellCompactClass,
	pageTitleClass,
} from '../../utils/formStyles';

const InventoryPageComponent = memo(function InventoryPage() {
	const { t } = useTranslation();

	return (
		<div className={pageShellCompactClass}>
			<h1 className={`${pageTitleClass} mb-6`}>
				{t('inventory.pageTitle')}
			</h1>

			<div className={comingSoonCardClass}>
				<div aria-hidden="true" className={comingSoonSheenClass} />

				<div className={comingSoonIconBadgeClass}>
					<Package
						className={comingSoonIconClass}
						strokeWidth={1.5}
						aria-hidden="true"
					/>
				</div>

				<h2 className={comingSoonTitleClass}>
					{t('inventory.comingSoonTitle')}
				</h2>
				<p className={comingSoonDescriptionClass}>
					{t('inventory.comingSoonDescription')}
				</p>

				<div className={comingSoonDividerClass} aria-hidden="true" />
			</div>
		</div>
	);
});

InventoryPageComponent.displayName = 'InventoryPage';

export const InventoryPage = InventoryPageComponent;
