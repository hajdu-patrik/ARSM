import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const InventoryPageComponent = memo(function InventoryPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-[#2C2440] dark:text-[#EDE8FA]">
        {t('inventory.pageTitle')}
      </h1>

      <div className="rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] p-8 text-center dark:border-[#3A3154] dark:bg-[#13131B]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFEBFA] dark:bg-[#241F33]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-purple-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-[#2C2440] dark:text-[#EDE8FA]">
          {t('inventory.comingSoonTitle')}
        </h2>
        <p className="text-sm text-[#6A627F] dark:text-[#B9B0D3]">
          {t('inventory.comingSoonDescription')}
        </p>
      </div>
    </div>
  );
});

InventoryPageComponent.displayName = 'InventoryPage';

export const InventoryPage = InventoryPageComponent;
