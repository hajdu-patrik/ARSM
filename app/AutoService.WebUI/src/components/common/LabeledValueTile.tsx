/**
 * Labeled value tile: a small bordered surface pairing a muted label with a
 * primary value, used by mobile-tile list rows (Inventory, Quotes,
 * Company results) so every tab does not hand-write the same markup.
 * @module components/common/LabeledValueTile
 */
import { memo, type ReactNode } from 'react';
import {
  compactDataSurfaceClass,
  compactPrimaryValueTextClass,
  mutedMetaTextClass,
} from '../../utils/formStyles';

interface LabeledValueTileProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly valueClassName?: string;
  readonly testId?: string;
}

const LabeledValueTileComponent = memo(function LabeledValueTile({
  label,
  value,
  valueClassName,
  testId,
}: LabeledValueTileProps) {
  const valueClasses = valueClassName
    ? `truncate ${valueClassName} ${compactPrimaryValueTextClass}`
    : `truncate ${compactPrimaryValueTextClass}`;

  return (
    <div className={compactDataSurfaceClass}>
      <p className={mutedMetaTextClass}>{label}</p>
      <p data-testid={testId} className={valueClasses}>{value}</p>
    </div>
  );
});

LabeledValueTileComponent.displayName = 'LabeledValueTile';

export const LabeledValueTile = LabeledValueTileComponent;
