/**
 * Colored status pill for a quote, following the appointment StatusBadge
 * pattern. Expired is a badge state but never a stored status: it comes from
 * the server's computed flag via `resolveQuoteDisplayStatus`.
 * @module pages/Quotes/components/QuoteStatusBadge
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPillBadge } from '../../../components/common/StatusPillBadge';
import { toneBadgeClasses, toneDotClasses, type SemanticTone } from '../../../utils/formStyles';
import type { QuoteDisplayStatus } from '../helpers';

/** Props for the {@link QuoteStatusBadge} component. */
interface QuoteStatusBadgeProps {
  /** The status to display, expiry included. */
  readonly status: QuoteDisplayStatus;
  /** Additional CSS classes appended to the badge element. */
  readonly className?: string;
}

/** Semantic tone of each quote status; the shared tone recipes supply the colors. */
const QUOTE_STATUS_TONE: Record<QuoteDisplayStatus, SemanticTone> = {
  Draft: 'neutral',
  Sent: 'info',
  Expired: 'warning',
  Accepted: 'success',
  Rejected: 'error',
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
  const tone = QUOTE_STATUS_TONE[status];

  return (
    <StatusPillBadge
      testId="quote-status-badge"
      colorClassName={toneBadgeClasses[tone]}
      dotClassName={toneDotClasses[tone]}
      label={t(QUOTE_STATUS_I18N_KEY[status])}
      className={className}
    />
  );
});

QuoteStatusBadgeComponent.displayName = 'QuoteStatusBadge';

/** Memoized colored quote status pill. */
export const QuoteStatusBadge = QuoteStatusBadgeComponent;
