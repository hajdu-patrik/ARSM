/** Colored status pill for a quote (StatusBadge pattern); Expired is a badge state only, resolved from the server flag via resolveQuoteDisplayStatus. */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPillBadge } from '../../../components/common/StatusPillBadge';
import { toneBadgeClasses, toneDotClasses, type SemanticTone } from '../../../utils/formStyles';
import type { QuoteDisplayStatus } from '../helpers';

interface QuoteStatusBadgeProps {
  readonly status: QuoteDisplayStatus;
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

const QUOTE_STATUS_I18N_KEY: Record<QuoteDisplayStatus, string> = {
  Draft: 'quotes.status.draft',
  Sent: 'quotes.status.sent',
  Expired: 'quotes.status.expired',
  Accepted: 'quotes.status.accepted',
  Rejected: 'quotes.status.rejected',
};

export const QuoteStatusBadge = memo(function QuoteStatusBadge({ status, className = '' }: QuoteStatusBadgeProps) {
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
