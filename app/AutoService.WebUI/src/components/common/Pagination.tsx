import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { rowIconActionNeutralClass } from '../../utils/styles/buttonStyles';
import { defaultIconClass, smallIconClass } from '../../utils/styles/textStyles';

interface PaginationProps {
  page: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  compact?: boolean;
  testIdPrefix: string;
  className?: string;
}

/** Previous/next arrow controls with a "page / total" indicator; renders nothing for an empty list. */
export function Pagination({
  page,
  totalCount,
  pageSize,
  onPageChange,
  isLoading = false,
  compact = false,
  testIdPrefix,
  className = '',
}: Readonly<PaginationProps>) {
  const { t } = useTranslation();

  if (totalCount <= 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const iconClass = compact ? smallIconClass : defaultIconClass;
  const indicatorTextClass = compact ? 'text-ui-caption' : 'text-ui-small';
  const gapClass = compact ? 'gap-1' : 'gap-2';

  return (
    <div
      className={`flex min-w-0 max-w-full items-center justify-center ${gapClass} ${className}`.trim()}
      aria-busy={isLoading}
    >
      <button
        type="button"
        className={rowIconActionNeutralClass}
        onClick={() => { onPageChange(currentPage - 1); }}
        disabled={currentPage <= 1}
        aria-label={t('common.pagination.previous')}
        title={t('common.pagination.previous')}
        data-testid={`${testIdPrefix}-prev`}
      >
        <ChevronLeft className={iconClass} aria-hidden="true" />
      </button>
      <span
        className={`min-w-[4.5rem] text-center font-medium tabular-nums text-ui-label ${indicatorTextClass}`}
        aria-live="polite"
        data-testid={`${testIdPrefix}-indicator`}
      >
        {t('common.pagination.pageIndicator', { page: currentPage, totalPages })}
      </span>
      <button
        type="button"
        className={rowIconActionNeutralClass}
        onClick={() => { onPageChange(currentPage + 1); }}
        disabled={currentPage >= totalPages}
        aria-label={t('common.pagination.next')}
        title={t('common.pagination.next')}
        data-testid={`${testIdPrefix}-next`}
      >
        <ChevronRight className={iconClass} aria-hidden="true" />
      </button>
    </div>
  );
}
