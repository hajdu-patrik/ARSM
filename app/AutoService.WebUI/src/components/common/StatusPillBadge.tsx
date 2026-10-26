/** Shared status-pill shell for feature status badges (appointment, quote).
 * See app/AutoService.WebUI/CLAUDE.md. */
import { memo } from 'react';

interface StatusPillBadgeProps {
  readonly colorClassName: string;
  /** Resolved Tailwind classes for the leading dot's background tone. Omit to hide the dot. */
  readonly dotClassName?: string;
  readonly label: string;
  readonly testId?: string;
  readonly className?: string;
}

export const StatusPillBadge = memo(function StatusPillBadge({
  colorClassName,
  dotClassName,
  label,
  testId,
  className = '',
}: StatusPillBadgeProps) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tracking-normal ${colorClassName} ${className}`}
    >
      {dotClassName && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} aria-hidden="true" />}
      {label}
    </span>
  );
});
