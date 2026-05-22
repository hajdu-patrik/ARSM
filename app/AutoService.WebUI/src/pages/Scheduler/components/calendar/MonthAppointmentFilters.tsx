/**
 * Month appointment list filter controls.
 * @module pages/Scheduler/components/calendar/MonthAppointmentFilters
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, X } from 'lucide-react';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { schedulerFilterChipButtonClass, schedulerFilterControlBaseClass } from '../../../../utils/formStyles';

const schedulerStatusChipClass = `${schedulerFilterControlBaseClass} whitespace-nowrap`;
const schedulerMechanicFilterSelectClass = 'h-11 min-h-11 w-full min-w-0 max-w-full truncate rounded-full border border-arsm-border bg-arsm-card px-3 py-2 pr-8 text-xs font-semibold text-arsm-label transition-colors hover:bg-arsm-hover focus-visible:border-arsm-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-arsm-border focus-visible:ring-0 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark dark:focus-visible:border-arsm-border-dark dark:focus-visible:outline-arsm-border-dark';
const schedulerMechanicFilterWrapperClass = 'min-w-0 max-w-full overflow-hidden basis-full sm:basis-auto sm:w-[9.125rem] sm:max-w-[9.125rem] sm:shrink-0';
const schedulerControlRowClass = 'flex min-w-0 max-w-full flex-wrap items-center gap-2';

const STATUS_FILTERS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];

const STATUS_CHIP_COLORS: Record<AppointmentStatus, { active: string; activeHover: string; activePress: string; inactive: string; inactiveHover: string; inactivePress: string; dot: string }> = {
  InProgress: {
    active: 'border-arsm-warning-border/95 bg-arsm-warning-bg text-arsm-warning-text ring-2 ring-arsm-warning-border/25 dark:border-arsm-warning-border-dark/95 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark dark:ring-arsm-warning-border-dark/25',
    activeHover: 'hover:border-arsm-warning-border hover:bg-arsm-warning-bg dark:hover:border-arsm-warning-border-dark dark:hover:bg-arsm-warning-bg-dark',
    activePress: 'active:border-arsm-warning-border active:bg-arsm-warning-bg active:saturate-150 active:brightness-95 dark:active:border-arsm-warning-border-dark dark:active:bg-arsm-warning-bg-dark',
    inactive: 'border-arsm-warning-border/45 bg-arsm-warning-bg/45 text-arsm-warning-text dark:border-arsm-warning-border-dark/45 dark:bg-arsm-warning-bg-dark/45 dark:text-arsm-warning-text-dark',
    inactiveHover: 'hover:border-arsm-warning-border/70 hover:bg-arsm-warning-bg/70 dark:hover:border-arsm-warning-border-dark/75 dark:hover:bg-arsm-warning-bg-dark/70',
    inactivePress: 'active:border-arsm-warning-border/90 active:bg-arsm-warning-bg/90 active:saturate-150 active:brightness-95 dark:active:border-arsm-warning-border-dark/90 dark:active:bg-arsm-warning-bg-dark/85',
    dot: 'bg-arsm-warning-accent',
  },
  Completed: {
    active: 'border-arsm-success-border/95 bg-arsm-success-soft text-arsm-success-text ring-2 ring-arsm-success-border/25 dark:border-arsm-success-border-dark/95 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark dark:ring-arsm-success-border-dark/25',
    activeHover: 'hover:border-arsm-success-border hover:bg-arsm-success-soft dark:hover:border-arsm-success-border-dark dark:hover:bg-arsm-success-bg-dark',
    activePress: 'active:border-arsm-success-border active:bg-arsm-success-soft active:saturate-150 active:brightness-95 dark:active:border-arsm-success-border-dark dark:active:bg-arsm-success-bg-dark',
    inactive: 'border-arsm-success-border/45 bg-arsm-success-soft/45 text-arsm-success-text dark:border-arsm-success-border-dark/45 dark:bg-arsm-success-bg-dark/45 dark:text-arsm-success-text-dark',
    inactiveHover: 'hover:border-arsm-success-border/70 hover:bg-arsm-success-soft/70 dark:hover:border-arsm-success-border-dark/75 dark:hover:bg-arsm-success-bg-dark/70',
    inactivePress: 'active:border-arsm-success-border/90 active:bg-arsm-success-soft/90 active:saturate-150 active:brightness-95 dark:active:border-arsm-success-border-dark/90 dark:active:bg-arsm-success-bg-dark/85',
    dot: 'bg-arsm-success-accent',
  },
  Cancelled: {
    active: 'border-arsm-error-border/95 bg-arsm-error-soft text-arsm-error-text ring-2 ring-arsm-error-border/25 dark:border-arsm-error-dark/95 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:ring-arsm-error-dark/25',
    activeHover: 'hover:border-arsm-error-border hover:bg-arsm-error-soft dark:hover:border-arsm-error-dark dark:hover:bg-arsm-error-bg-dark',
    activePress: 'active:border-arsm-error-border active:bg-arsm-error-soft active:saturate-150 active:brightness-95 dark:active:border-arsm-error-dark dark:active:bg-arsm-error-bg-dark',
    inactive: 'border-arsm-error-border/45 bg-arsm-error-soft/45 text-arsm-error-text dark:border-arsm-error-dark/45 dark:bg-arsm-error-bg-dark/45 dark:text-arsm-error-text-light',
    inactiveHover: 'hover:border-arsm-error-border/70 hover:bg-arsm-error-soft/70 dark:hover:border-arsm-error-dark/75 dark:hover:bg-arsm-error-bg-dark/70',
    inactivePress: 'active:border-arsm-error-border/90 active:bg-arsm-error-soft/90 active:saturate-150 active:brightness-95 dark:active:border-arsm-error-dark/90 dark:active:bg-arsm-error-bg-dark/85',
    dot: 'bg-arsm-error-accent',
  },
};

interface MonthAppointmentFiltersProps {
  readonly selectedStatuses: Set<AppointmentStatus>;
  readonly uniqueMechanics: [number, string][];
  readonly selectedMechanicId: number | null;
  readonly selectedDay: number | null;
  readonly sortAsc: boolean;
  readonly onToggleStatus: (status: AppointmentStatus) => void;
  readonly onMechanicChange: (mechanicId: number | null) => void;
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

/** Renders month-list sort, day reset, status, and mechanic filters. */
const MonthAppointmentFiltersComponent = memo(function MonthAppointmentFilters({
  selectedStatuses,
  uniqueMechanics,
  selectedMechanicId,
  selectedDay,
  sortAsc,
  onToggleStatus,
  onMechanicChange,
  onToggleSort,
  onClearFilter,
}: MonthAppointmentFiltersProps) {
  const { t } = useTranslation();
  const selectedMechanicName = selectedMechanicId === null
    ? t('scheduler.monthList.mechanicAll')
    : uniqueMechanics.find(([id]) => id === selectedMechanicId)?.[1] ?? t('scheduler.monthList.mechanicAll');

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3 sm:items-end">
      <div className={`${schedulerControlRowClass} w-full justify-start sm:w-auto sm:justify-end`}>
        <button type="button" onClick={onToggleSort} className={schedulerFilterChipButtonClass} title={t('scheduler.monthList.sortByDate')}>
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">{sortAsc ? t('scheduler.monthList.sortAsc') : t('scheduler.monthList.sortDesc')}</span>
        </button>

        {selectedDay !== null && (
          <button type="button" onClick={onClearFilter} className={`${schedulerFilterChipButtonClass} hover:border-arsm-accent/55 dark:hover:border-arsm-accent-dark/55`}>
            <X className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{t('scheduler.monthList.clearFilter')}</span>
          </button>
        )}
      </div>

      <div className={schedulerControlRowClass}>
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

        <div className={schedulerMechanicFilterWrapperClass}>
          <select
            value={selectedMechanicId ?? ''}
            title={selectedMechanicName}
            onChange={(event) => onMechanicChange(parseMechanicFilterValue(event.target.value))}
            className={schedulerMechanicFilterSelectClass}
          >
            <option value="">{t('scheduler.monthList.mechanicAll')}</option>
            {uniqueMechanics.map(([id, name]) => (
              <option key={id} value={id} title={name}>{truncateMechanicLabel(name)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});

MonthAppointmentFiltersComponent.displayName = 'MonthAppointmentFilters';

export const MonthAppointmentFilters = MonthAppointmentFiltersComponent;
