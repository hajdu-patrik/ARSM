/**
 * Inventory page placeholder.
 *
 * Renders a coming-soon panel for inventory management.
 * @module pages/Inventory/page
 */

import { memo } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const InventoryPageComponent = memo(function InventoryPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-arsm-primary dark:text-arsm-primary-dark">
        {t('inventory.pageTitle')}
      </h1>

      <div className="rounded-2xl border border-arsm-border bg-arsm-input p-8 text-center dark:border-arsm-border-dark dark:bg-arsm-card-dark">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark">
          <Package className="h-8 w-8 text-purple-500" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <h2 className="mb-2 text-lg font-semibold text-arsm-primary dark:text-arsm-primary-dark">
          {t('inventory.comingSoonTitle')}
        </h2>
        <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">
          {t('inventory.comingSoonDescription')}
        </p>
      </div>
    </div>
  );
});

InventoryPageComponent.displayName = 'InventoryPage';

/** Inventory route component with coming-soon content. */
export const InventoryPage = InventoryPageComponent;
