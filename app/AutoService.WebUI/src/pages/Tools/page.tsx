/**
 * Tools page placeholder.
 *
 * Renders a coming-soon panel for workshop tools management.
 * @module pages/Tools/page
 */

import { memo } from 'react';
import { Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ToolsPageComponent = memo(function ToolsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-arsm-primary dark:text-arsm-primary-dark">
        {t('tools.pageTitle')}
      </h1>

      <div className="rounded-2xl border border-arsm-border bg-arsm-input p-8 text-center dark:border-arsm-border-dark dark:bg-arsm-card-dark">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark">
          <Wrench className="h-8 w-8 text-purple-500" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <h2 className="mb-2 text-lg font-semibold text-arsm-primary dark:text-arsm-primary-dark">
          {t('tools.comingSoonTitle')}
        </h2>
        <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">
          {t('tools.comingSoonDescription')}
        </p>
      </div>
    </div>
  );
});

ToolsPageComponent.displayName = 'ToolsPage';

/** Tools route component with coming-soon content. */
export const ToolsPage = ToolsPageComponent;
