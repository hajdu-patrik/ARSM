/** Header strip of the mobile column rows; the first label keeps its words whole, the others may wrap. */
import { memo } from 'react';
import type { DataListColumn } from '../../../components/common/DataList';
import { mobileHeaderStripClass } from './mobileColumns';

interface MobileColumnStripProps {
  readonly columns: readonly DataListColumn[];
}

const MobileColumnStripComponent = memo(function MobileColumnStrip({ columns }: MobileColumnStripProps) {
  return (
    <div className={mobileHeaderStripClass}>
      {columns.map((col, index) => (
        <span
          key={col.key}
          className={`min-w-0 ${index === 0 ? '' : '[overflow-wrap:anywhere] '}${col.align === 'right' ? 'text-right' : ''}`}
        >
          {col.label}
        </span>
      ))}
    </div>
  );
});

MobileColumnStripComponent.displayName = 'MobileColumnStrip';

export const MobileColumnStrip = MobileColumnStripComponent;
