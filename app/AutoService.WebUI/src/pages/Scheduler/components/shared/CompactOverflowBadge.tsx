/** In-flow "+N" counter shown after an avatar stack; it takes its own space, so it never covers an avatar. */
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

const CompactOverflowBadgeComponent = memo(function CompactOverflowBadge({
  count,
  size = 'md',
  className,
}: CompactOverflowBadgeProps) {
  return (
    <span
      className={`pointer-events-none inline-flex ${SIZE_CLASSES[size]} shrink-0 items-center justify-center rounded-full border border-arsm-border bg-arsm-card text-[11px] font-semibold leading-none text-arsm-muted dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-muted-dark ${className ?? ''}`}
      aria-hidden="true"
    >
      +{count}
    </span>
  );
});

CompactOverflowBadgeComponent.displayName = 'CompactOverflowBadge';

export const CompactOverflowBadge = CompactOverflowBadgeComponent;