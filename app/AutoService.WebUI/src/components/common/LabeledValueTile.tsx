/** Labeled value tile: bordered surface pairing a muted label with a primary value,
 * shared by mobile-tile list rows so features don't hand-write the same markup. */
import { memo, type ReactNode } from 'react';
import {
  compactDataSurfaceClass,
  compactPrimaryValueTextClass,
  mutedMetaTextClass,
} from '../../utils/formStyles';

/** Values wrap instead of truncating, so a money amount, number, plate or date is never ellipsized. */
const valueWrapClass = '[overflow-wrap:anywhere]';

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
    ? `${valueWrapClass} ${valueClassName} ${compactPrimaryValueTextClass}`
    : `${valueWrapClass} ${compactPrimaryValueTextClass}`;

  return (
    <div className={compactDataSurfaceClass}>
      <p className={mutedMetaTextClass}>{label}</p>
      <p data-testid={testId} className={valueClasses}>{value}</p>
    </div>
  );
});

LabeledValueTileComponent.displayName = 'LabeledValueTile';

export const LabeledValueTile = LabeledValueTileComponent;
