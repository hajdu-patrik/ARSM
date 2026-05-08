import { memo } from 'react';

interface CompactOverflowBadgeProps {
  readonly count: number;
  readonly className?: string;
}

const CompactOverflowBadgeComponent = memo(function CompactOverflowBadge({
  count,
  className,
}: CompactOverflowBadgeProps) {
  return (
    <span
      className={`pointer-events-none absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-arsm-border bg-arsm-card px-1 text-[8px] font-semibold leading-none text-arsm-muted dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-muted-dark ${className ?? ''}`}
      aria-hidden="true"
    >
      +{count}
    </span>
  );
});

CompactOverflowBadgeComponent.displayName = 'CompactOverflowBadge';

export const CompactOverflowBadge = CompactOverflowBadgeComponent;