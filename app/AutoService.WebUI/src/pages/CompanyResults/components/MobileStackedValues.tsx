/** Value cells of a Company results row: three columns from 360px, one labelled line each below it. */
import { memo } from 'react';
import { DataListCell, DataListText } from '../../../components/common/DataList';
import { numericValueWrapTextClass } from '../../../utils/formStyles';
import { mobileStackedCellClass, mobileStackedLabelClass } from './mobileColumns';

/** One formatted figure of a row, with its column key and its below-360px label. */
export interface MobileStackedValue {
  readonly column: string;
  readonly label: string;
  readonly value: string;
  readonly emphasized?: boolean;
  /** Ellipsizes the figure in the table layout; by default it wraps there too, so an amount is never cut. */
  readonly ellipsis?: boolean;
}

interface MobileStackedValuesProps {
  readonly values: readonly MobileStackedValue[];
}

const MobileStackedValuesComponent = memo(function MobileStackedValues({ values }: MobileStackedValuesProps) {
  return (
    <>
      {values.map((item) => {
        const weightClass = item.emphasized ? 'font-semibold' : '';

        return (
          <DataListCell
            key={item.column}
            column={item.column}
            label={item.label}
            className={mobileStackedCellClass}
            labelClassName={mobileStackedLabelClass}
          >
            {item.ellipsis
              ? <DataListText kind="amount" title={item.value} className={weightClass}>{item.value}</DataListText>
              : <p className={`${numericValueWrapTextClass} ${weightClass}`}>{item.value}</p>}
          </DataListCell>
        );
      })}
    </>
  );
});

MobileStackedValuesComponent.displayName = 'MobileStackedValues';

export const MobileStackedValues = MobileStackedValuesComponent;
