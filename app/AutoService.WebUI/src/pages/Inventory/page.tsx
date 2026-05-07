/**
 * Inventory page placeholder.
 * Renders a coming-soon panel for inventory management.
 * @module pages/Inventory/page
 */
import { memo } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { pageShellCompactClass, pageTitleClass } from '../../utils/formStyles';

const InventoryPageComponent = memo(function InventoryPage() {
	const { t } = useTranslation();

	return (
		<div className={pageShellCompactClass}>
			<h1 className={`${pageTitleClass} mb-6`}>
				{t('inventory.pageTitle')}
			</h1>

			<div className="arsm-coming-soon-card fade-in-up">
				<div aria-hidden="true" className="arsm-coming-soon-sheen" />

				<div className="arsm-coming-soon-icon-badge">
					<Package
						className="h-9 w-9 text-arsm-accent-vivid dark:text-arsm-accent"
						strokeWidth={1.5}
						aria-hidden="true"
					/>
				</div>

				<h2 className="mb-2 text-xl font-semibold text-arsm-primary dark:text-arsm-primary-dark">
					{t('inventory.comingSoonTitle')}
				</h2>
				<p className="mx-auto max-w-sm text-sm leading-relaxed text-arsm-muted dark:text-arsm-muted-dark">
					{t('inventory.comingSoonDescription')}
				</p>

				<div className="arsm-coming-soon-divider" aria-hidden="true" />
			</div>
		</div>
	);
});

InventoryPageComponent.displayName = 'InventoryPage';

export const InventoryPage = InventoryPageComponent;
