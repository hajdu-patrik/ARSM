/**
 * Tools page placeholder.
 * Renders a coming-soon panel for workshop tools management.
 * @module pages/Tools/page
 */
import { memo } from 'react';
import { Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { pageShellCompactClass, pageTitleClass } from '../../utils/formStyles';

const ToolsPageComponent = memo(function ToolsPage() {
	const { t } = useTranslation();

	return (
		<div className={pageShellCompactClass}>
			<h1 className={`${pageTitleClass} mb-6`}>
				{t('tools.pageTitle')}
			</h1>

			<div className="arsm-coming-soon-card fade-in-up">
				<div aria-hidden="true" className="arsm-coming-soon-sheen" />

				<div className="arsm-coming-soon-icon-badge">
					<Wrench
						className="h-9 w-9 text-arsm-accent-vivid dark:text-arsm-accent"
						strokeWidth={1.5}
						aria-hidden="true"
					/>
				</div>

				<h2 className="mb-2 text-xl font-semibold text-arsm-primary dark:text-arsm-primary-dark">
					{t('tools.comingSoonTitle')}
				</h2>
				<p className="mx-auto max-w-sm text-sm leading-relaxed text-arsm-muted dark:text-arsm-muted-dark">
					{t('tools.comingSoonDescription')}
				</p>

				<div className="arsm-coming-soon-divider" aria-hidden="true" />
			</div>
		</div>
	);
});

ToolsPageComponent.displayName = 'ToolsPage';

export const ToolsPage = ToolsPageComponent;
