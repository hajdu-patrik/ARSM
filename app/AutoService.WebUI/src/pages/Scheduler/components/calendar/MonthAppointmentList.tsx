import { memo, type ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, X } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import {
  compactSelectClass,
  insetSurfaceClass,
  schedulerMiniNeutralActionButtonClass,
} from '../../../../utils/formStyles';
import { AppointmentCard } from '../shared/AppointmentCard';

interface MonthAppointmentListProps {
  readonly appointments: AppointmentDto[];
  readonly isLoading: boolean;
  readonly currentMechanicId: number | undefined;
  readonly selectedDay: number | null;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
  readonly onCardClick: (appointment: AppointmentDto) => void;
  readonly onClearFilter: () => void;
}

const STATUS_FILTERS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];

const STATUS_CHIP_COLORS: Record<AppointmentStatus, { active: string; inactive: string }> = {
  InProgress: {
    active: 'bg-arsm-warning-accent text-arsm-on-accent dark:bg-arsm-warning-accent dark:text-arsm-on-accent-dark',
    inactive: 'bg-arsm-warning-bg text-arsm-warning-text dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark',
  },
  Completed: {
    active: 'bg-arsm-success-accent text-arsm-on-accent dark:bg-arsm-success-accent dark:text-arsm-on-accent-dark',
    inactive: 'bg-arsm-success-bg text-arsm-success-text dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark',
  },
  Cancelled: {
    active: 'bg-arsm-error-accent text-arsm-on-accent dark:bg-arsm-error-accent dark:text-arsm-on-accent-dark',
    inactive: 'bg-arsm-error-bg text-arsm-error-text dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-dark',
  },
};

const PLACEHOLDER_MECHANIC_NAME_PATTERN = /^(?:unknown|ismeretlen|n\/a|none|-+)$/i;

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

const MonthAppointmentListComponent = memo(function MonthAppointmentList({
  appointments,
  isLoading,
  currentMechanicId,
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 3 }, (_, index) => (
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
      <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${shouldSpanSingleCard ? 'md:grid-cols-1' : ''}`}>
        {sortedAppointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            currentMechanicId={currentMechanicId}
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark sm:text-lg">
            {t('scheduler.monthList.title')}
          </h3>
          <p className="text-xs text-arsm-muted dark:text-arsm-muted-dark sm:text-sm">
            {t('scheduler.monthList.count', { count: sortedAppointments.length })}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setSortAsc((previousSortOrder) => !previousSortOrder)}
            className={`${schedulerMiniNeutralActionButtonClass} hover:bg-arsm-accent-wash dark:hover:bg-arsm-hover-dark/80`}
            title={t('scheduler.monthList.sortByDate')}
          >
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{sortAsc ? t('scheduler.monthList.sortAsc') : t('scheduler.monthList.sortDesc')}</span>
          </button>

          {selectedDay !== null && (
            <button
              type="button"
              onClick={onClearFilter}
              className={`${schedulerMiniNeutralActionButtonClass} hover:border-arsm-accent/55 hover:bg-arsm-accent-wash dark:hover:border-arsm-accent-dark/55 dark:hover:bg-arsm-hover-dark/80`}
            >
              <X className="h-3 w-3 shrink-0" />
              <span className="truncate">{t('scheduler.monthList.clearFilter')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
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
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-90 ${chipStateClass}`}
            >
              {t(`scheduler.status.${status.toLowerCase()}`)}
            </button>
          );
        })}

        <div className="min-w-0 basis-full overflow-hidden sm:basis-auto">
          <select
            value={selectedMechanicId ?? ''}
            onChange={(event) => setSelectedMechanicId(parseMechanicFilterValue(event.target.value))}
            className={`${compactSelectClass} w-full min-w-0 max-w-full truncate rounded-lg bg-arsm-card px-2.5 py-1.5 text-xs hover:bg-arsm-hover dark:bg-arsm-input-dark dark:hover:bg-arsm-hover-dark`}
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
