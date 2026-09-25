/**
 * Shared status-pill shell: a small rounded, bordered badge with an optional
 * leading colored dot, used by feature-owned status badges (appointment,
 * quote) so every status family renders the same pill geometry instead of
 * each hand-writing its own markup.
 * @module components/common/StatusPillBadge
 */
import { memo } from 'react';

/** Props for the {@link StatusPillBadge} component. */
interface StatusPillBadgeProps {
  /** Resolved Tailwind classes for the pill's background/text/border tone. */
  readonly colorClassName: string;
  /** Resolved Tailwind classes for the leading dot's background tone. Omit to hide the dot. */
  readonly dotClassName?: string;
  /** Localized status label to display. */
  readonly label: string;
  /** Optional `data-testid` for the rendered element. */
  readonly testId?: string;
  /** Additional CSS classes appended to the badge element. */
  readonly className?: string;
}

const StatusPillBadgeComponent = memo(function StatusPillBadge({
  colorClassName,
  dotClassName,
  label,
  testId,
  className = '',
}: StatusPillBadgeProps) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-normal ${colorClassName} ${className}`}
    >
      {dotClassName && <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} aria-hidden="true" />}
      {label}
    </span>
  );
});

StatusPillBadgeComponent.displayName = 'StatusPillBadge';

/** Memoized shared status-pill shell (color/dot/label resolved by the caller). */
export const StatusPillBadge = StatusPillBadgeComponent;
