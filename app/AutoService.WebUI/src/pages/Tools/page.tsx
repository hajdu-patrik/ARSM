/**
 * Tools page placeholder.
 * Renders a coming-soon panel for workshop tools management.
 * @module pages/Tools/page
 */
import { memo } from 'react';
import { Wrench } from 'lucide-react';
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

const ToolsPageComponent = memo(function ToolsPage() {
	const { t } = useTranslation();

	return (
		<div className={pageShellCompactClass}>
			<h1 className={`${pageTitleClass} mb-6`}>
				{t('tools.pageTitle')}
			</h1>

			<div className={comingSoonCardClass}>
				<div aria-hidden="true" className={comingSoonSheenClass} />

				<div className={comingSoonIconBadgeClass}>
					<Wrench
						className={comingSoonIconClass}
						strokeWidth={1.5}
						aria-hidden="true"
					/>
				</div>

				<h2 className={comingSoonTitleClass}>
					{t('tools.comingSoonTitle')}
				</h2>
				<p className={comingSoonDescriptionClass}>
					{t('tools.comingSoonDescription')}
				</p>

				<div className={comingSoonDividerClass} aria-hidden="true" />
			</div>
		</div>
	);
});

ToolsPageComponent.displayName = 'ToolsPage';

export const ToolsPage = ToolsPageComponent;
