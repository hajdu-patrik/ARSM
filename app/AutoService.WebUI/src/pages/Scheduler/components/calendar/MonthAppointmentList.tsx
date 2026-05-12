/**
 * Filterable monthly appointment list for the Scheduler calendar section.
 * @module pages/Scheduler/components/calendar/MonthAppointmentList
 */
import { memo, type ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, X } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import {
  compactSelectFullClass,
  controlRowClass,
  insetSurfaceClass,
  schedulerMiniNeutralActionButtonClass,
  selectWrapperClass,
} from '../../../../utils/formStyles';
import { AppointmentCard } from '../shared/AppointmentCard';

const schedulerFilterButtonClass = `${schedulerMiniNeutralActionButtonClass} w-auto shrink-0 overflow-hidden whitespace-nowrap hover:bg-arsm-accent-wash dark:hover:bg-arsm-hover-dark/80`;
const schedulerStatusChipClass = `${schedulerMiniNeutralActionButtonClass} w-auto shrink-0 justify-center overflow-hidden whitespace-nowrap border hover:opacity-90`;
const schedulerMechanicFilterSelectClass = `${compactSelectFullClass} h-11 min-h-11 rounded-full bg-arsm-card px-3.5 py-1.5 text-xs font-semibold [&>option]:text-xs hover:bg-arsm-hover dark:bg-arsm-input-dark dark:hover:bg-arsm-hover-dark`;

interface MonthAppointmentListProps {
  readonly appointments: AppointmentDto[];
  readonly isLoading: boolean;
  readonly currentMechanicId: number | undefined;
  readonly isAdmin: boolean;
  readonly selectedDay: number | null;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
  readonly onCardClick: (appointment: AppointmentDto) => void;
  readonly onClearFilter: () => void;
}

const STATUS_FILTERS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];
const MONTH_LIST_SKELETON_COUNT = 4;

const STATUS_CHIP_COLORS: Record<AppointmentStatus, { active: string; inactive: string; dot: string }> = {
  InProgress: {
    active: 'border-arsm-warning-border/90 bg-arsm-warning-bg text-arsm-warning-text ring-2 ring-arsm-warning-border/20 dark:border-arsm-warning-border-dark/90 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark dark:ring-arsm-warning-border-dark/20',
    inactive: 'border-arsm-warning-border/70 bg-arsm-warning-bg text-arsm-warning-text dark:border-arsm-warning-border-dark/70 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark',
    dot: 'bg-arsm-warning-accent',
  },
  Completed: {
    active: 'border-arsm-success-border/90 bg-arsm-success-soft text-arsm-success-text ring-2 ring-arsm-success-border/20 dark:border-arsm-success-border-dark/90 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark dark:ring-arsm-success-border-dark/20',
    inactive: 'border-arsm-success-border/70 bg-arsm-success-soft text-arsm-success-text dark:border-arsm-success-border-dark/70 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark',
    dot: 'bg-arsm-success-accent',
  },
  Cancelled: {
    active: 'border-arsm-error-border/90 bg-arsm-error-soft text-arsm-error-text ring-2 ring-arsm-error-border/20 dark:border-arsm-error-dark/90 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:ring-arsm-error-dark/20',
    inactive: 'border-arsm-error-border/70 bg-arsm-error-soft text-arsm-error-text dark:border-arsm-error-dark/70 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light',
    dot: 'bg-arsm-error-accent',
  },
};

const PLACEHOLDER_MECHANIC_NAME_PATTERN = /^(?:unknown|ismeretlen|n\/a|none|-+)$/i;

/** Returns whether a mechanic name is placeholder text that should be hidden from filters. */
function isPlaceholderMechanicName(fullName: string): boolean {
  return PLACEHOLDER_MECHANIC_NAME_PATTERN.test(fullName.trim());
}

/** Parses mechanic filter select values and safely resets the filter for invalid input. */
function parseMechanicFilterValue(value: string): number | null {
  if (value === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

/** Displays the current month's appointments with status, mechanic, day, and date-sort controls. */
const MonthAppointmentListComponent = memo(function MonthAppointmentList({
  appointments,
  isLoading,
  currentMechanicId,
  isAdmin,
  selectedDay,
  onClaim,
  onUnclaim,
  onCardClick,
  onClearFilter,
}: MonthAppointmentListProps) {
  const { t } = useTranslation();

  const [selectedStatuses, setSelectedStatuses] = useState<Set<AppointmentStatus>>(new Set());
  const [selectedMechanicId, setSelectedMechanicId] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const toggleStatus = useCallback((status: AppointmentStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const uniqueMechanics = useMemo(() => {
    const mechanicNameById = new Map<number, string>();
    for (const appt of appointments) {
      for (const mechanic of appt.mechanics) {
        const normalizedName = mechanic.fullName.trim();
        if (normalizedName.length === 0 || isPlaceholderMechanicName(normalizedName)) {
          continue;
        }

        if (!mechanicNameById.has(mechanic.id)) {
          mechanicNameById.set(mechanic.id, normalizedName);
        }
      }
    }

    return Array.from(mechanicNameById.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    let result = appointments;

    if (selectedDay !== null) {
      result = result.filter((a) => new Date(a.scheduledDate).getDate() === selectedDay);
    }

    if (selectedStatuses.size > 0) {
      result = result.filter((a) => selectedStatuses.has(a.status));
    }

    if (selectedMechanicId !== null) {
      result = result.filter((a) => a.mechanics.some((m) => m.id === selectedMechanicId));
    }

    return result;
  }, [appointments, selectedDay, selectedStatuses, selectedMechanicId]);

  const sortedAppointments = useMemo(() => {
    const sorted = [...filteredAppointments];
    sorted.sort((a, b) => {
      const aTs = new Date(a.scheduledDate).getTime();
      const bTs = new Date(b.scheduledDate).getTime();
      return sortAsc ? aTs - bTs : bTs - aTs;
    });
    return sorted;
  }, [filteredAppointments, sortAsc]);

  const shouldSpanSingleCard = sortedAppointments.length === 1;
  const emptyMessageKey = selectedDay === null ? 'scheduler.monthList.empty' : 'scheduler.monthList.emptyFiltered';

  let listContent: ReactNode;
  if (isLoading) {
    listContent = (
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: MONTH_LIST_SKELETON_COUNT }, (_, index) => (
          <div
            key={`month-skeleton-${index}`}
            className="min-h-40 animate-pulse rounded-2xl border border-arsm-border bg-arsm-card dark:border-arsm-border-dark dark:bg-arsm-input-dark"
          />
        ))}
      </div>
    );
  } else if (sortedAppointments.length === 0) {
    listContent = (
      <div className="rounded-xl border border-arsm-border border-dashed bg-arsm-toggle-bg px-4 py-8 text-center text-sm text-arsm-muted dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-muted-dark">
        {t(emptyMessageKey)}
      </div>
    );
  } else {
    listContent = (
      <div className={`grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 ${shouldSpanSingleCard ? 'md:grid-cols-1' : ''}`}>
        {sortedAppointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            currentMechanicId={currentMechanicId}
            isAdmin={isAdmin}
            onClaim={onClaim}
            onUnclaim={onUnclaim}
            onClick={() => onCardClick(appointment)}
          />
        ))}
      </div>
    );
  }

  return (
    <section className={`${insetSurfaceClass} p-3 sm:p-4`}>
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark sm:text-lg">
            {t('scheduler.monthList.title')}
          </h3>
          <p className="text-xs text-arsm-muted dark:text-arsm-muted-dark sm:text-sm">
            {t('scheduler.monthList.count', { count: sortedAppointments.length })}
          </p>
        </div>

        <div className={`${controlRowClass} justify-end`}>
          <button
            type="button"
            onClick={() => setSortAsc((previousSortOrder) => !previousSortOrder)}
            className={schedulerFilterButtonClass}
            title={t('scheduler.monthList.sortByDate')}
          >
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{sortAsc ? t('scheduler.monthList.sortAsc') : t('scheduler.monthList.sortDesc')}</span>
          </button>

          {selectedDay !== null && (
            <button
              type="button"
              onClick={onClearFilter}
              className={`${schedulerFilterButtonClass} hover:border-arsm-accent/55 dark:hover:border-arsm-accent-dark/55`}
            >
              <X className="h-3 w-3 shrink-0" />
              <span className="truncate">{t('scheduler.monthList.clearFilter')}</span>
            </button>
          )}
        </div>
      </div>

      <div className={`mb-4 ${controlRowClass}`}>
        {STATUS_FILTERS.map((status) => {
          const isActive = selectedStatuses.has(status);
          const colors = STATUS_CHIP_COLORS[status];
          const chipStateClass = isActive
            ? `${colors.active} border-transparent`
            : `${colors.inactive} border-arsm-border dark:border-arsm-border-dark`;

          return (
            <button
              type="button"
              key={status}
              onClick={() => toggleStatus(status)}
              aria-pressed={isActive}
              className={`${schedulerStatusChipClass} ${chipStateClass}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} aria-hidden="true" />
              <span className="truncate">{t(`scheduler.status.${status.toLowerCase()}`)}</span>
            </button>
          );
        })}

        <div className={`${selectWrapperClass} basis-full sm:basis-auto sm:min-w-[8.75rem] sm:max-w-[11rem]`}> 
          <select
            value={selectedMechanicId ?? ''}
            onChange={(event) => setSelectedMechanicId(parseMechanicFilterValue(event.target.value))}
            className={schedulerMechanicFilterSelectClass}
          >
            <option value="">{t('scheduler.monthList.mechanicAll')}</option>
            {uniqueMechanics.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {listContent}
    </section>
  );
});

MonthAppointmentListComponent.displayName = 'MonthAppointmentList';
export const MonthAppointmentList = MonthAppointmentListComponent;
