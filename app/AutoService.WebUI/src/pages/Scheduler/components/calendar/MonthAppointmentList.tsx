/**
 * Filterable monthly appointment list for the Scheduler calendar section.
 * @module pages/Scheduler/components/calendar/MonthAppointmentList
 */
import { memo, type ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, X } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { insetSurfaceClass } from '../../../../utils/formStyles';
import { AppointmentCard } from '../shared/AppointmentCard';

const schedulerCompactControlClass = 'inline-flex h-8 min-h-8 w-auto min-w-0 shrink-0 items-center justify-center gap-1 rounded-full border border-arsm-border bg-arsm-card px-2.5 py-1 text-[11px] font-semibold leading-none text-arsm-label transition-colors dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark';
const schedulerFilterButtonClass = `${schedulerCompactControlClass} whitespace-nowrap hover:bg-arsm-accent-wash dark:hover:bg-arsm-hover-dark/80`;
const schedulerStatusChipClass = `${schedulerCompactControlClass} whitespace-nowrap`;
const schedulerMechanicFilterSelectClass = 'h-8 min-h-8 w-full min-w-0 max-w-full truncate rounded-full border border-arsm-border bg-arsm-card px-2.5 py-1 pr-7 text-[11px] font-semibold text-arsm-label transition-colors hover:bg-arsm-hover focus-visible:border-arsm-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-arsm-border focus-visible:ring-0 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark dark:focus-visible:border-arsm-border-dark dark:focus-visible:outline-arsm-border-dark';
const schedulerMechanicFilterWrapperClass = 'w-[8.375rem] min-w-[8.375rem] max-w-[8.375rem] shrink-0 sm:w-[9.125rem] sm:min-w-[9.125rem] sm:max-w-[9.125rem]';
const schedulerControlRowClass = 'flex min-w-0 max-w-full flex-wrap items-center gap-2';

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

/** Truncates long mechanic names to keep the select content compact and readable. */
function truncateMechanicLabel(fullName: string, maxLength = 16): string {
  const normalized = fullName.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
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

  const selectedMechanicName = useMemo(() => {
    if (selectedMechanicId === null) {
      return t('scheduler.monthList.mechanicAll');
    }

    return uniqueMechanics.find(([id]) => id === selectedMechanicId)?.[1] ?? t('scheduler.monthList.mechanicAll');
  }, [selectedMechanicId, t, uniqueMechanics]);

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
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark sm:text-lg">
            {t('scheduler.monthList.title')}
          </h3>
          <p className="text-xs text-arsm-muted dark:text-arsm-muted-dark sm:text-sm">
            {t('scheduler.monthList.count', { count: sortedAppointments.length })}
          </p>
        </div>

        <div className={`${schedulerControlRowClass} w-full justify-start sm:w-auto sm:justify-end`}>
          <button
            type="button"
            onClick={() => setSortAsc((previousSortOrder) => !previousSortOrder)}
            className={schedulerFilterButtonClass}
            title={t('scheduler.monthList.sortByDate')}
          >
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">{sortAsc ? t('scheduler.monthList.sortAsc') : t('scheduler.monthList.sortDesc')}</span>
          </button>

          {selectedDay !== null && (
            <button
              type="button"
              onClick={onClearFilter}
              className={`${schedulerFilterButtonClass} hover:border-arsm-accent/55 dark:hover:border-arsm-accent-dark/55`}
            >
              <X className="h-3 w-3 shrink-0" />
              <span className="min-w-0 truncate">{t('scheduler.monthList.clearFilter')}</span>
            </button>
          )}
        </div>
      </div>

      <div className={`mb-4 ${schedulerControlRowClass}`}>
        {STATUS_FILTERS.map((status) => {
          const isActive = selectedStatuses.has(status);
          const colors = STATUS_CHIP_COLORS[status];
          const chipStateClass = isActive
            ? `${colors.active} ${colors.activeHover} ${colors.activePress}`
            : `${colors.inactive} ${colors.inactiveHover} ${colors.inactivePress}`;

          return (
            <button
              type="button"
              key={status}
              onClick={() => toggleStatus(status)}
              aria-pressed={isActive}
              className={`${schedulerStatusChipClass} ${chipStateClass}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} aria-hidden="true" />
              <span>{t(`scheduler.status.${status.toLowerCase()}`)}</span>
            </button>
          );
        })}

        <div className={schedulerMechanicFilterWrapperClass}>
          <select
            value={selectedMechanicId ?? ''}
            title={selectedMechanicName}
            onChange={(event) => setSelectedMechanicId(parseMechanicFilterValue(event.target.value))}
            className={schedulerMechanicFilterSelectClass}
          >
            <option value="">{t('scheduler.monthList.mechanicAll')}</option>
            {uniqueMechanics.map(([id, name]) => (
              <option key={id} value={id} title={name}>
                {truncateMechanicLabel(name)}
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
