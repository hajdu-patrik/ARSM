/**
 * Month appointment list filter controls.
 * @module pages/Scheduler/components/calendar/MonthAppointmentFilters
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, X } from 'lucide-react';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { compactChipNeutralButtonClass, filterSelectCompactClass, filterSelectCompactWrapperClass, smallIconClass, toneDotClasses, toneFilterChipClasses } from '../../../../utils/formStyles';
import { APPOINTMENT_STATUS_TONE } from '../../utils/appointmentStatusTone';
import { schedulerMonthClearFilterButtonClass, schedulerStatusFilterChipButtonClass } from '../../utils/schedulerButtonStyles';

const schedulerControlRowClass = 'flex min-w-0 max-w-full flex-wrap items-center gap-2';

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

function parseMechanicFilterValue(value: string): number | null {
  if (value === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function truncateMechanicLabel(fullName: string, maxLength = 16): string {
  const normalized = fullName.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}

/** Renders month-list sort and day-reset controls for the header row. */
const MonthAppointmentSortControlsComponent = memo(function MonthAppointmentSortControls({
  selectedDay,
  sortAsc,
  onToggleSort,
  onClearFilter,
}: MonthAppointmentSortControlsProps) {
  const { t } = useTranslation();

  return (
    <div className={`${schedulerControlRowClass} w-full justify-start sm:w-auto sm:flex-nowrap sm:justify-end`}>
      <button type="button" onClick={onToggleSort} className={compactChipNeutralButtonClass} title={t('scheduler.monthList.sortByDate')}>
        <ArrowUpDown className={smallIconClass} />
        <span className="min-w-0 truncate">{sortAsc ? t('scheduler.monthList.sortAsc') : t('scheduler.monthList.sortDesc')}</span>
      </button>

      {selectedDay !== null && (
        <button type="button" onClick={onClearFilter} className={schedulerMonthClearFilterButtonClass}>
          <X className={smallIconClass} />
          <span className="min-w-0 truncate">{t('scheduler.monthList.clearFilter')}</span>
        </button>
      )}
    </div>
  );
});

/** Renders month-list status and mechanic filters below the header row. */
const MonthAppointmentFiltersComponent = memo(function MonthAppointmentFilters({
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
          <button type="button" key={status} onClick={() => onToggleStatus(status)} aria-pressed={isActive} className={`${schedulerStatusFilterChipButtonClass} ${chipStateClass}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDotClasses[tone]}`} aria-hidden="true" />
            <span>{t(`scheduler.status.${status.toLowerCase()}`)}</span>
          </button>
        );
      })}

      <div className={filterSelectCompactWrapperClass}>
        <select
          value={selectedMechanicId ?? ''}
          title={selectedMechanicName}
          aria-label={t('scheduler.monthList.mechanicAll')}
          onChange={(event) => onMechanicChange(parseMechanicFilterValue(event.target.value))}
          className={filterSelectCompactClass}
        >
          <option value="">{t('scheduler.monthList.mechanicAll')}</option>
          {uniqueMechanics.map(([id, name]) => (
            <option key={id} value={id} title={name}>{truncateMechanicLabel(name)}</option>
          ))}
        </select>
      </div>
    </div>
  );
});

MonthAppointmentSortControlsComponent.displayName = 'MonthAppointmentSortControls';
MonthAppointmentFiltersComponent.displayName = 'MonthAppointmentFilters';

export const MonthAppointmentSortControls = MonthAppointmentSortControlsComponent;
export const MonthAppointmentFilters = MonthAppointmentFiltersComponent;
