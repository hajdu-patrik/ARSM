/**
 * Monthly appointment list rendered as a continuous sorted card grid.
 * Provides status filter chips, mechanic dropdown filter, date sort toggle,
 * day filtering, and loading skeletons. All filters combine with each other
 * and with the selected day.
 * @module MonthAppointmentList
 */
import { memo, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowUpDown, CalendarDays } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { AppointmentCard } from '../shared/AppointmentCard';

/** Props for the {@link MonthAppointmentList} component. */
interface MonthAppointmentListProps {
  /** All appointments for the current month. */
  readonly appointments: AppointmentDto[];
  /** Whether appointment data is currently loading. */
  readonly isLoading: boolean;
  /** ID of the currently authenticated mechanic. */
  readonly currentMechanicId: number | undefined;
  /** Currently selected day filter, or null if showing all days. */
  readonly selectedDay: number | null;
  /** Callback to claim an appointment by ID. */
  readonly onClaim: (id: number) => Promise<void>;
  /** Callback when an appointment card is clicked to open detail. */
  readonly onCardClick: (appointment: AppointmentDto) => void;
  /** Callback to clear the day filter. */
  readonly onClearFilter: () => void;
}

/** Ordered list of status values available as filter chips. */
const STATUS_FILTERS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];

/** Active/inactive Tailwind color classes for each status filter chip. */
const STATUS_CHIP_COLORS: Record<AppointmentStatus, { active: string; inactive: string }> = {
  InProgress: {
    active: 'bg-arsm-warning-accent text-white shadow-[0_4px_12px_rgba(245,158,11,0.3)] dark:bg-arsm-warning-accent dark:text-white dark:shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
    inactive: 'bg-arsm-warning-bg text-arsm-warning-text dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark',
  },
  Completed: {
    active: 'bg-arsm-success-accent text-white shadow-[0_4px_12px_rgba(34,197,94,0.3)] dark:bg-arsm-success-accent dark:text-white dark:shadow-[0_4px_12px_rgba(34,197,94,0.2)]',
    inactive: 'bg-arsm-success-bg text-arsm-success-text dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark',
  },
  Cancelled: {
    active: 'bg-arsm-error-accent text-white shadow-[0_4px_12px_rgba(215,82,94,0.3)] dark:bg-arsm-error-accent dark:text-white dark:shadow-[0_4px_12px_rgba(215,82,94,0.2)]',
    inactive: 'bg-arsm-error-bg text-arsm-error-text dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light',
  },
};

const MonthAppointmentListComponent = memo(function MonthAppointmentList({
  appointments,
  isLoading,
  currentMechanicId,
  selectedDay,
  onClaim,
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
    const map = new Map<number, string>();
    for (const appt of appointments) {
      for (const m of appt.mechanics) {
        if (!map.has(m.id)) {
          map.set(m.id, m.fullName);
        }
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [appointments]);

  const filtered = useMemo(() => {
    let result = appointments;

    // Day filter
    if (selectedDay !== null) {
      result = result.filter((a) => new Date(a.scheduledDate).getDate() === selectedDay);
    }

    // Status filter
    if (selectedStatuses.size > 0) {
      result = result.filter((a) => selectedStatuses.has(a.status));
    }

    // Mechanic filter
    if (selectedMechanicId !== null) {
      result = result.filter((a) => a.mechanics.some((m) => m.id === selectedMechanicId));
    }

    return result;
  }, [appointments, selectedDay, selectedStatuses, selectedMechanicId]);

  const sortedAppointments = useMemo(() => {
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const aTs = new Date(a.scheduledDate).getTime();
      const bTs = new Date(b.scheduledDate).getTime();
      return sortAsc ? aTs - bTs : bTs - aTs;
    });
    return sorted;
  }, [filtered, sortAsc]);

  const shouldSpanSingleCard = sortedAppointments.length === 1;
  const emptyMessageKey = selectedDay === null
    ? 'scheduler.monthList.empty'
    : 'scheduler.monthList.emptyFiltered';

  return (
    <section className="min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-xl font-bold tracking-tight text-arsm-primary dark:text-arsm-primary-dark">
          {t('scheduler.monthList.title')}
        </h2>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-arsm-border bg-arsm-toggle-bg px-3 py-1 text-xs font-semibold text-arsm-primary shadow-[0_6px_14px_rgba(45,36,64,0.1)] dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-hover dark:shadow-[0_8px_16px_rgba(5,8,20,0.45)]">
            {t('scheduler.monthList.count', { count: appointments.length })}
          </span>
          {selectedDay !== null && (
            <button
              onClick={onClearFilter}
              className="inline-flex items-center gap-1 rounded-full border border-arsm-border bg-arsm-accent-subtle px-3 py-1 text-xs font-medium text-arsm-label transition-colors hover:border-arsm-accent/55 hover:bg-arsm-accent-wash dark:border-arsm-border-dark dark:bg-arsm-hover-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/55 dark:hover:bg-arsm-hover-dark/80"
            >
              <X className="w-3 h-3" />
              {t('scheduler.monthList.clearFilter')}
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Status chips */}
        {STATUS_FILTERS.map((status) => {
          const isActive = selectedStatuses.has(status);
          const colors = STATUS_CHIP_COLORS[status];
          const chipStateClass = isActive
            ? `${colors.active} border-transparent shadow-sm`
            : `${colors.inactive} border-arsm-border dark:border-arsm-border-dark`;

          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-90 ${chipStateClass}`}
            >
              {t(`scheduler.status.${status.toLowerCase()}`)}
            </button>
          );
        })}

        {/* Mechanic dropdown */}
        <select
          value={selectedMechanicId ?? ''}
          onChange={(e) => setSelectedMechanicId(e.target.value ? Number(e.target.value) : null)}
          aria-label={t('scheduler.filter.allMechanics')}
          className="min-w-0 max-w-[10rem] truncate rounded-full border border-arsm-border bg-gray-100 px-3 py-1 text-xs font-medium text-arsm-label transition-colors hover:bg-gray-200 focus:outline-none dark:border-arsm-border-dark dark:bg-arsm-hover-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
        >
          <option value="">{t('scheduler.filter.allMechanics')}</option>
          {uniqueMechanics.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        {/* Sort toggle */}
        <button
          onClick={() => setSortAsc((prev) => !prev)}
          title={sortAsc ? t('scheduler.filter.sortAsc') : t('scheduler.filter.sortDesc')}
          className="inline-flex items-center gap-1 rounded-full border border-arsm-border bg-gray-100 px-3 py-1 text-xs font-medium text-arsm-label transition-colors hover:bg-gray-200 dark:border-arsm-border-dark dark:bg-arsm-hover-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortAsc ? t('scheduler.filter.sortAsc') : t('scheduler.filter.sortDesc')}
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-52 rounded-2xl border border-arsm-border bg-arsm-input p-5 shadow-[0_12px_28px_rgba(28,22,46,0.08)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_16px_34px_rgba(3,5,14,0.52)]">
              <div className="shimmer-skeleton h-5 rounded-lg w-2/3 mb-4" />
              <div className="shimmer-skeleton h-3.5 rounded-md w-1/2 mb-4" />
              <div className="shimmer-skeleton h-16 rounded-xl mb-4" />
              <div className="shimmer-skeleton h-3.5 rounded-md w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="fade-in-up rounded-2xl border border-dashed border-arsm-border/70 bg-arsm-input/60 py-14 text-center dark:border-arsm-border-dark/60 dark:bg-arsm-card-dark/40">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark">
            <CalendarDays className="h-6 w-6 text-arsm-muted dark:text-arsm-muted-dark" />
          </div>
          <p className="text-sm font-medium text-arsm-muted dark:text-arsm-muted-dark">{t(emptyMessageKey)}</p>
        </div>
      )}

      {/* Continuous appointment grid */}
      {!isLoading && sortedAppointments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sortedAppointments.map((appointment) => (
            <div key={appointment.id} className={shouldSpanSingleCard ? 'sm:col-span-2' : ''}>
              <AppointmentCard
                appointment={appointment}
                currentMechanicId={currentMechanicId}
                onClaim={onClaim}
                onClick={() => onCardClick(appointment)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

MonthAppointmentListComponent.displayName = 'MonthAppointmentList';

/** Memoized monthly appointment list with filtering, sorting, and card grid. */
export const MonthAppointmentList = MonthAppointmentListComponent;
