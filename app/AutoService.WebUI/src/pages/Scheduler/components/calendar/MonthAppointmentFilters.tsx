/**
 * Month appointment list filter controls.
 * @module pages/Scheduler/components/calendar/MonthAppointmentFilters
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, X } from 'lucide-react';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { compactSortToggleButtonClass, filterSelectCompactClass, filterSelectCompactWrapperClass } from '../../../../utils/formStyles';

const schedulerChipBaseClass = 'inline-flex min-h-7 min-w-0 shrink-0 items-center gap-1 rounded-xl border px-2.5 py-0.5 text-[10px] font-semibold leading-normal tracking-normal whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 max-[350px]:min-h-11 max-[350px]:px-3 max-[350px]:py-2 max-[350px]:text-xs dark:focus-visible:ring-arsm-focus-ring/30';
const schedulerStatusChipClass = schedulerChipBaseClass;
const schedulerControlRowClass = 'flex min-w-0 max-w-full flex-wrap items-center gap-2';

const STATUS_FILTERS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];

const STATUS_CHIP_COLORS: Record<AppointmentStatus, { inactive: string; inactiveHover: string; inactivePress: string; active: string; activeHover: string; activePress: string; dot: string }> = {
  InProgress: {
    inactive: 'border-arsm-warning-border/65 bg-arsm-warning-bg/65 text-arsm-warning-text dark:border-arsm-warning-border-dark/65 dark:bg-arsm-warning-bg-dark/65 dark:text-arsm-warning-text-dark',
    inactiveHover: 'hover:border-arsm-warning-border/80 hover:bg-arsm-warning-bg/80 dark:hover:border-arsm-warning-border-dark/80 dark:hover:bg-arsm-warning-bg-dark/80',
    inactivePress: 'active:border-arsm-warning-border active:bg-arsm-warning-bg active:saturate-125 dark:active:border-arsm-warning-border-dark dark:active:bg-arsm-warning-bg-dark',
    active: 'border-arsm-warning-border bg-arsm-warning-bg text-arsm-warning-text ring-2 ring-arsm-warning-border/35 dark:border-arsm-warning-border-dark dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark dark:ring-arsm-warning-border-dark/35',
    activeHover: 'hover:border-arsm-warning-border hover:bg-arsm-warning-bg dark:hover:border-arsm-warning-border-dark dark:hover:bg-arsm-warning-bg-dark',
    activePress: 'active:border-arsm-warning-border active:bg-arsm-warning-bg active:saturate-150 active:brightness-95 dark:active:border-arsm-warning-border-dark dark:active:bg-arsm-warning-bg-dark',
    dot: 'bg-arsm-warning-accent',
  },
  Completed: {
    inactive: 'border-arsm-success-border/65 bg-arsm-success-soft/65 text-arsm-success-text dark:border-arsm-success-border-dark/65 dark:bg-arsm-success-bg-dark/65 dark:text-arsm-success-text-dark',
    inactiveHover: 'hover:border-arsm-success-border/80 hover:bg-arsm-success-soft/80 dark:hover:border-arsm-success-border-dark/80 dark:hover:bg-arsm-success-bg-dark/80',
    inactivePress: 'active:border-arsm-success-border active:bg-arsm-success-soft active:saturate-125 dark:active:border-arsm-success-border-dark dark:active:bg-arsm-success-bg-dark',
    active: 'border-arsm-success-border bg-arsm-success-soft text-arsm-success-text ring-2 ring-arsm-success-border/35 dark:border-arsm-success-border-dark dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark dark:ring-arsm-success-border-dark/35',
    activeHover: 'hover:border-arsm-success-border hover:bg-arsm-success-soft dark:hover:border-arsm-success-border-dark dark:hover:bg-arsm-success-bg-dark',
    activePress: 'active:border-arsm-success-border active:bg-arsm-success-soft active:saturate-150 active:brightness-95 dark:active:border-arsm-success-border-dark dark:active:bg-arsm-success-bg-dark',
    dot: 'bg-arsm-success-accent',
  },
  Cancelled: {
    inactive: 'border-arsm-error-border/65 bg-arsm-error-soft/65 text-arsm-error-text dark:border-arsm-error-dark/65 dark:bg-arsm-error-bg-dark/65 dark:text-arsm-error-text-light',
    inactiveHover: 'hover:border-arsm-error-border/80 hover:bg-arsm-error-soft/80 dark:hover:border-arsm-error-dark/80 dark:hover:bg-arsm-error-bg-dark/80',
    inactivePress: 'active:border-arsm-error-border active:bg-arsm-error-soft active:saturate-125 dark:active:border-arsm-error-dark dark:active:bg-arsm-error-bg-dark',
    active: 'border-arsm-error-border bg-arsm-error-soft text-arsm-error-text ring-2 ring-arsm-error-border/35 dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:ring-arsm-error-dark/35',
    activeHover: 'hover:border-arsm-error-border hover:bg-arsm-error-soft dark:hover:border-arsm-error-dark dark:hover:bg-arsm-error-bg-dark',
    activePress: 'active:border-arsm-error-border active:bg-arsm-error-soft active:saturate-150 active:brightness-95 dark:active:border-arsm-error-dark dark:active:bg-arsm-error-bg-dark',
    dot: 'bg-arsm-error-accent',
  },
};

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
      <button type="button" onClick={onToggleSort} className={compactSortToggleButtonClass} title={t('scheduler.monthList.sortByDate')}>
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 truncate">{sortAsc ? t('scheduler.monthList.sortAsc') : t('scheduler.monthList.sortDesc')}</span>
      </button>

      {selectedDay !== null && (
        <button type="button" onClick={onClearFilter} className={`${compactSortToggleButtonClass} hover:border-arsm-accent/55 dark:hover:border-arsm-accent-dark/55`}>
          <X className="h-3 w-3 shrink-0" />
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
        const colors = STATUS_CHIP_COLORS[status];
        const chipStateClass = isActive
          ? `${colors.active} ${colors.activeHover} ${colors.activePress}`
          : `${colors.inactive} ${colors.inactiveHover} ${colors.inactivePress}`;

        return (
          <button type="button" key={status} onClick={() => onToggleStatus(status)} aria-pressed={isActive} className={`${schedulerStatusChipClass} ${chipStateClass}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} aria-hidden="true" />
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
