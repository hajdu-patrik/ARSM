/**
 * Monthly appointment list rendered as a continuous sorted card grid.
 * Provides status filter chips, mechanic dropdown filter, date sort toggle,
 * day filtering, and loading skeletons. All filters combine with each other
 * and with the selected day.
 * @module MonthAppointmentList
 */
import { memo, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowUpDown } from 'lucide-react';
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
    active: 'bg-yellow-500 text-white dark:bg-yellow-600 dark:text-white',
    inactive: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  Completed: {
    active: 'bg-green-500 text-white dark:bg-green-600 dark:text-white',
    inactive: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  Cancelled: {
    active: 'bg-red-500 text-white dark:bg-red-600 dark:text-white',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
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
        <h2 className="text-xl font-bold text-arsm-primary dark:text-arsm-primary-dark">
          {t('scheduler.monthList.title')}
        </h2>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark text-arsm-primary dark:text-arsm-hover text-xs font-medium px-3 py-1 rounded-full">
            {t('scheduler.monthList.count', { count: appointments.length })}
          </span>
          {selectedDay !== null && (
            <button
              onClick={onClearFilter}
              className="inline-flex items-center gap-1 bg-arsm-accent/20 dark:bg-arsm-accent-dark/20 text-arsm-label dark:text-arsm-label-dark text-xs font-medium px-3 py-1 rounded-full hover:bg-arsm-accent/40 dark:hover:bg-arsm-accent-dark/40 transition-colors"
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
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${isActive ? colors.active : colors.inactive} hover:opacity-80`}
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
          className="text-xs font-medium px-3 py-1 rounded-full border border-arsm-border dark:border-arsm-border-dark bg-arsm-input dark:bg-arsm-input-dark text-arsm-primary dark:text-arsm-primary-dark min-w-0 max-w-[10rem] truncate focus:outline-none"
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
          className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border border-arsm-border dark:border-arsm-border-dark bg-arsm-input dark:bg-arsm-input-dark text-arsm-primary dark:text-arsm-primary-dark hover:bg-arsm-accent-subtle dark:hover:bg-arsm-hover-dark transition-colors"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortAsc ? t('scheduler.filter.sortAsc') : t('scheduler.filter.sortDesc')}
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-arsm-input dark:bg-arsm-card-dark rounded-2xl border border-arsm-border dark:border-arsm-border-dark p-4 h-48 animate-pulse">
              <div className="h-4 bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark rounded w-2/3 mb-3" />
              <div className="h-3 bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark rounded w-1/2 mb-3" />
              <div className="h-16 bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark rounded mb-3" />
              <div className="h-3 bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-arsm-muted dark:text-arsm-muted-dark">
          <p>{t(emptyMessageKey)}</p>
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
