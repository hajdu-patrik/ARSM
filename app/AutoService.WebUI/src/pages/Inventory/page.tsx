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
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-arsm-primary dark:text-arsm-primary-dark">
        {t('inventory.pageTitle')}
      </h1>

      <div className="fade-in-up relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-input p-10 text-center shadow-[0_14px_34px_rgba(28,22,46,0.11),0_0_0_1px_rgba(255,255,255,0.5)_inset] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_20px_42px_rgba(3,5,14,0.58),0_0_0_1px_rgba(255,255,255,0.04)_inset]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)]"
        />

        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-arsm-accent/25 bg-arsm-accent-wash shadow-[0_10px_24px_rgba(97,67,154,0.12)] dark:border-arsm-accent-dark/30 dark:bg-arsm-hover-dark dark:shadow-[0_12px_28px_rgba(5,8,20,0.5)]">
          <Package className="h-9 w-9 text-arsm-accent-vivid dark:text-arsm-accent" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-arsm-primary dark:text-arsm-primary-dark">
          {t('inventory.comingSoonTitle')}
        </h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-arsm-muted dark:text-arsm-muted-dark">
          {t('inventory.comingSoonDescription')}
        </p>

        <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-arsm-accent/30 dark:bg-arsm-accent-dark/30" aria-hidden="true" />
      </div>
    </div>
  );
});

InventoryPageComponent.displayName = 'InventoryPage';

/** Inventory route component with coming-soon content. */
export const InventoryPage = InventoryPageComponent;
