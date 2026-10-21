/** "+N" counter shown after an avatar stack; in flow by default, so it takes its own space and never covers an avatar.
 * The calendar day cell takes it out of the flow, beside the dot, from md up. */
import { memo } from 'react';

/** Badge sizes: `md` follows avatar stacks, `sm` the calendar day dot. */
const SIZE_CLASSES = {
  sm: 'h-3.5 min-w-3.5 px-0.5',
  md: 'h-4 min-w-4 px-1',
} as const;

interface CompactOverflowBadgeProps {
  readonly count: number;
  readonly size?: keyof typeof SIZE_CLASSES;
  readonly className?: string;
}

/** Memoized decorative "+N" overflow counter (aria-hidden). */
export const CompactOverflowBadge = memo(function CompactOverflowBadge({
  count,
  size = 'md',
  className,
}: CompactOverflowBadgeProps) {
  return (
    <span
      className={`pointer-events-none inline-flex ${SIZE_CLASSES[size]} shrink-0 items-center justify-center rounded-full border border-ui-border bg-ui-card text-ui-micro font-semibold leading-none text-ui-muted ${className ?? ''}`}
      aria-hidden="true"
    >
      +{count}
    </span>
  );
});
