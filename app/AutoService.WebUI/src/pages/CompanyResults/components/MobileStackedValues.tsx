/** Labelled value lines that replace the three-column mobile row below 360px. */
import { memo } from 'react';
import { mutedMetaTextClass, numericValueWrapTextClass } from '../../../utils/formStyles';
import { mobileStackedValueRowClass, mobileStackedValuesClass } from './mobileColumns';

export interface MobileStackedValue {
  readonly label: string;
  readonly value: string;
  readonly emphasized?: boolean;
}

interface MobileStackedValuesProps {
  readonly values: readonly MobileStackedValue[];
}

const MobileStackedValuesComponent = memo(function MobileStackedValues({ values }: MobileStackedValuesProps) {
  return (
    <dl className={mobileStackedValuesClass}>
      {values.map((item) => (
        <div key={item.label} className={mobileStackedValueRowClass}>
          <dt className={mutedMetaTextClass}>{item.label}</dt>
          <dd className={item.emphasized ? `${numericValueWrapTextClass} font-semibold` : numericValueWrapTextClass}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
});

MobileStackedValuesComponent.displayName = 'MobileStackedValues';

export const MobileStackedValues = MobileStackedValuesComponent;
