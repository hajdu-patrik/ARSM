/** Month appointment list filter controls. */

import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, X } from 'lucide-react';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { Dropdown } from '../../../../components/common/Dropdown';
import { filterSelectCompactWrapperClass, smallIconClass, toneDotClasses, toneFilterChipClasses } from '../../../../utils/formStyles';
import { APPOINTMENT_STATUS_TONE } from '../../utils/appointmentStatusTone';
import { schedulerChipLabelClass, schedulerMonthClearFilterButtonClass, schedulerSortButtonClass, schedulerStatusFilterChipButtonClass } from '../../utils/schedulerButtonStyles';

const schedulerControlRowClass = 'flex min-w-0 max-w-full flex-wrap items-center gap-2';
/** Sort and clear-day chips share one row; their columns shrink equally (labels wrap) only when the row is too narrow. */
const schedulerSortControlsRowClass = 'grid min-w-0 max-w-full auto-cols-[minmax(0,max-content)] grid-flow-col gap-2';

const STATUS_FILTERS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];

interface MonthAppointmentFiltersProps {
  readonly selectedStatuses: Set<AppointmentStatus>;
  readonly uniqueMechanics: [number, string][];
  readonly selectedMechanicId: number | null;
  readonly onToggleStatus: (status: AppointmentStatus) => void;
  readonly onMechanicChange: (mechanicId: number | null) => void;
}

interface MonthAppointmentSortControlsProps {
  readonly selectedDay: number | null;
  readonly sortAsc: boolean;
  readonly onToggleSort: () => void;
  readonly onClearFilter: () => void;
}

/** Maps the mechanic select value to an id; empty or non-numeric means "all mechanics". */
function parseMechanicFilterValue(value: string): number | null {
  if (value === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

/** Renders month-list sort and day-reset controls for the header row. */
export const MonthAppointmentSortControls = memo(function MonthAppointmentSortControls({
  selectedDay,
  sortAsc,
  onToggleSort,
  onClearFilter,
}: MonthAppointmentSortControlsProps) {
  const { t } = useTranslation();

  return (
    <div className={schedulerSortControlsRowClass}>
      <button type="button" onClick={onToggleSort} className={schedulerSortButtonClass} title={t('scheduler.monthList.sortByDate')}>
        <ArrowUpDown className={smallIconClass} />
        <span className={schedulerChipLabelClass}>{sortAsc ? t('scheduler.monthList.sortAsc') : t('scheduler.monthList.sortDesc')}</span>
      </button>

      {selectedDay !== null && (
        <button type="button" onClick={onClearFilter} className={schedulerMonthClearFilterButtonClass}>
          <X className={smallIconClass} />
          <span className={schedulerChipLabelClass}>{t('scheduler.monthList.clearFilter')}</span>
        </button>
      )}
    </div>
  );
});

/** Renders month-list status and mechanic filters below the header row. */
export const MonthAppointmentFilters = memo(function MonthAppointmentFilters({
  selectedStatuses,
  uniqueMechanics,
  selectedMechanicId,
  onToggleStatus,
  onMechanicChange,
}: MonthAppointmentFiltersProps) {
  const { t } = useTranslation();
  const selectedMechanicName = selectedMechanicId === null
    ? t('scheduler.monthList.mechanicAll')
    : uniqueMechanics.find(([id]) => id === selectedMechanicId)?.[1] ?? t('scheduler.monthList.mechanicAll');
  const mechanicOptions = useMemo(() => [
    { value: '', label: t('scheduler.monthList.mechanicAll') },
    ...uniqueMechanics.map(([id, name]) => ({ value: String(id), label: name })),
  ], [t, uniqueMechanics]);

  return (
    <div className={`${schedulerControlRowClass} w-full justify-start`}>
      {STATUS_FILTERS.map((status) => {
        const isActive = selectedStatuses.has(status);
        const tone = APPOINTMENT_STATUS_TONE[status];
        const colors = toneFilterChipClasses[tone];
        const chipStateClass = isActive
          ? `${colors.active} ${colors.activeHover} ${colors.activePress}`
          : `${colors.inactive} ${colors.inactiveHover} ${colors.inactivePress}`;

        return (
          <button
            type="button"
            key={status}
            onClick={() => {
              onToggleStatus(status);
            }}
            aria-pressed={isActive}
            className={`${schedulerStatusFilterChipButtonClass} ${chipStateClass}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDotClasses[tone]}`} aria-hidden="true" />
            <span>{t(`scheduler.status.${status.toLowerCase()}`)}</span>
          </button>
        );
      })}

      <div className={filterSelectCompactWrapperClass} title={selectedMechanicName}>
        <Dropdown
          size="compactSlim"
          value={selectedMechanicId === null ? '' : String(selectedMechanicId)}
          options={mechanicOptions}
          ariaLabel={t('scheduler.monthList.mechanicAll')}
          onChange={(value) => {
            onMechanicChange(parseMechanicFilterValue(value));
          }}
        />
      </div>
    </div>
  );
});
