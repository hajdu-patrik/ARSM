/**
 * Filterable monthly appointment list for the Scheduler calendar section.
 * @module pages/Scheduler/components/calendar/MonthAppointmentList
 */
import { memo, type ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import {
  baseSectionHeadingTextClass,
  defaultBorderToneClass,
  insetSurfaceClass,
  mutedMetaTextClass,
  mutedSecondaryTextClass,
  roundedOverflowBorderLayoutClass,
} from '../../../../utils/formStyles';
import { AppointmentCard } from '../shared/AppointmentCard';
import { MonthAppointmentFilters, MonthAppointmentSortControls } from './MonthAppointmentFilters';

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

const MONTH_LIST_SKELETON_COUNT = 4;

const PLACEHOLDER_MECHANIC_NAME_PATTERN = /^(?:unknown|ismeretlen|n\/a|none|-+)$/i;

/** Returns whether a mechanic name is placeholder text that should be hidden from filters. */
function isPlaceholderMechanicName(fullName: string): boolean {
  return PLACEHOLDER_MECHANIC_NAME_PATTERN.test(fullName.trim());
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
            className={`${roundedOverflowBorderLayoutClass} ${defaultBorderToneClass} min-h-40 animate-pulse motion-reduce:animate-none bg-arsm-card dark:bg-arsm-input-dark`}
          />
        ))}
      </div>
    );
  } else if (sortedAppointments.length === 0) {
    listContent = (
      <div className={`rounded-xl border border-arsm-border border-dashed bg-arsm-toggle-bg px-4 py-8 text-center dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark ${mutedSecondaryTextClass}`}>
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
      <div className="mb-4 flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col">
            <h3 className={`truncate ${baseSectionHeadingTextClass} sm:text-lg`}>
              {t('scheduler.monthList.title')}
            </h3>
            <p className={`${mutedMetaTextClass} sm:text-sm`}>
              {t('scheduler.monthList.count', { count: sortedAppointments.length })}
            </p>
          </div>

          <MonthAppointmentSortControls
            selectedDay={selectedDay}
            sortAsc={sortAsc}
            onToggleSort={() => setSortAsc((previousSortOrder) => !previousSortOrder)}
            onClearFilter={onClearFilter}
          />
        </div>

        <MonthAppointmentFilters
          selectedStatuses={selectedStatuses}
          uniqueMechanics={uniqueMechanics}
          selectedMechanicId={selectedMechanicId}
          onToggleStatus={toggleStatus}
          onMechanicChange={setSelectedMechanicId}
        />
      </div>

      {listContent}
    </section>
  );
});

MonthAppointmentListComponent.displayName = 'MonthAppointmentList';
export const MonthAppointmentList = MonthAppointmentListComponent;
