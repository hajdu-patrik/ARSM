/**
 * Colored status pill for a quote, following the appointment StatusBadge
 * pattern. Expired is a badge state but never a stored status: it comes from
 * the server's computed flag via `resolveQuoteDisplayStatus`.
 * @module pages/Quotes/components/QuoteStatusBadge
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPillBadge } from '../../../components/common/StatusPillBadge';
import type { QuoteDisplayStatus } from '../helpers';

/** Props for the {@link QuoteStatusBadge} component. */
interface QuoteStatusBadgeProps {
  /** The status to display, expiry included. */
  readonly status: QuoteDisplayStatus;
  /** Additional CSS classes appended to the badge element. */
  readonly className?: string;
}

/** Tailwind color classes for each quote status (light + dark mode). */
const QUOTE_STATUS_COLORS: Record<QuoteDisplayStatus, string> = {
  Draft: 'bg-arsm-toggle-bg text-arsm-label border-arsm-border dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:border-arsm-border-dark',
  Sent: 'bg-arsm-info-bg text-arsm-info-text border-arsm-info-border/70 dark:bg-arsm-info-bg-dark dark:text-arsm-info-text-dark dark:border-arsm-info-border-dark/70',
  Expired: 'bg-arsm-warning-bg text-arsm-warning-text border-arsm-warning-border/70 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark dark:border-arsm-warning-border-dark/70',
  Accepted: 'bg-arsm-success-soft text-arsm-success-text border-arsm-success-border/70 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark dark:border-arsm-success-border-dark/70',
  Rejected: 'bg-arsm-error-soft text-arsm-error-text border-arsm-error-border/70 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:border-arsm-error-dark/70',
};

/** Dot color classes for each quote status. */
const QUOTE_STATUS_DOT: Record<QuoteDisplayStatus, string> = {
  Draft: 'bg-arsm-status-dot-fallback',
  Sent: 'bg-arsm-info-ring',
  Expired: 'bg-arsm-warning-accent',
  Accepted: 'bg-arsm-success-accent',
  Rejected: 'bg-arsm-error-accent',
};

/** i18n translation key for each quote status label. */
const QUOTE_STATUS_I18N_KEY: Record<QuoteDisplayStatus, string> = {
  Draft: 'quotes.status.draft',
  Sent: 'quotes.status.sent',
  Expired: 'quotes.status.expired',
  Accepted: 'quotes.status.accepted',
  Rejected: 'quotes.status.rejected',
};

const QuoteStatusBadgeComponent = memo(function QuoteStatusBadge({ status, className = '' }: QuoteStatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <StatusPillBadge
      testId="quote-status-badge"
      colorClassName={QUOTE_STATUS_COLORS[status]}
      dotClassName={QUOTE_STATUS_DOT[status]}
      label={t(QUOTE_STATUS_I18N_KEY[status])}
      className={className}
    />
  );
});

QuoteStatusBadgeComponent.displayName = 'QuoteStatusBadge';

/** Memoized colored quote status pill. */
export const QuoteStatusBadge = QuoteStatusBadgeComponent;
