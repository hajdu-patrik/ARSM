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
      <h1 className="mb-6 text-2xl font-bold text-[#2C2440] dark:text-[#EDE8FA]">
        {t('tools.pageTitle')}
      </h1>

      <div className="rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] p-8 text-center dark:border-[#3A3154] dark:bg-[#13131B]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFEBFA] dark:bg-[#241F33]">
          <Wrench className="h-8 w-8 text-purple-500" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <h2 className="mb-2 text-lg font-semibold text-[#2C2440] dark:text-[#EDE8FA]">
          {t('tools.comingSoonTitle')}
        </h2>
        <p className="text-sm text-[#6A627F] dark:text-[#B9B0D3]">
          {t('tools.comingSoonDescription')}
        </p>
      </div>
    </div>
  );
});

ToolsPageComponent.displayName = 'ToolsPage';

/** Tools route component with coming-soon content. */
export const ToolsPage = ToolsPageComponent;
