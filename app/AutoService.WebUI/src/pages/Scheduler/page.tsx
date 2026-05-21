/**
 * Scheduler page — the main data-fetching orchestrator for the workshop calendar.
 *
 * Composes the summary strip, calendar view, quick-intake section, month
 * appointment list, appointment detail modal, and intake modal into a
 * stacked layout. Manages selected-appointment and selected-day state,
 * keeps the modal appointment synchronized with store updates, and runs
 * background refresh for near-realtime claim/status updates.
 *
 * @module SchedulerPage
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useSchedulerStore } from '../../store/scheduler.store';
import { useToastStore } from '../../store/toast.store';
import type {
  AppointmentDto,
} from '../../types/scheduler/scheduler.types';
import { CalendarView } from './components/calendar/CalendarView';
import { MonthAppointmentList } from './components/calendar/MonthAppointmentList';
import { AppointmentDetailModal } from './components/detail/AppointmentDetailModal';
import { SchedulerIntakeModal } from './components/intake/SchedulerIntakeModal';
import { SchedulerSummaryStrip } from './components/summary/SchedulerSummaryStrip';
import { SchedulerQuickIntakeSection } from './components/summary/SchedulerQuickIntakeSection';
import { useSchedulerSummary } from './hooks/useSchedulerSummary';
import { useSchedulerDataSync } from './hooks/useSchedulerDataSync';
import { useSchedulerActions } from './hooks/useSchedulerActions';
import { pageShellClass } from '../../utils/formStyles';

interface SchedulerFocusState {
  readonly focusAppointmentId: number;
  readonly focusScheduledDate: string;
}

function parseSchedulerFocusState(value: unknown): SchedulerFocusState | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  const candidate = value as {
    readonly focusAppointmentId?: unknown;
    readonly focusScheduledDate?: unknown;
  };

  if (typeof candidate.focusAppointmentId !== 'number' || !Number.isFinite(candidate.focusAppointmentId)) {
    return null;
  }

  if (typeof candidate.focusScheduledDate !== 'string') {
    return null;
  }

  return {
    focusAppointmentId: candidate.focusAppointmentId,
    focusScheduledDate: candidate.focusScheduledDate,
  };
}

/**
 * Composes and coordinates the scheduler page sections and modal flows.
 * Keeps selected appointment content synchronized with store updates.
 */
const SchedulerPageComponent = memo(function SchedulerPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const todayAppointments = useSchedulerStore((state) => state.todayAppointments);
  const monthAppointments = useSchedulerStore((state) => state.monthAppointments);
  const calendarAppointments = useSchedulerStore((state) => state.calendarAppointments);
  const calendarYear = useSchedulerStore((state) => state.calendarYear);
  const calendarMonth = useSchedulerStore((state) => state.calendarMonth);
  const selectedDay = useSchedulerStore((state) => state.selectedDay);
  const isLoadingMonth = useSchedulerStore((state) => state.isLoadingMonth);
  const setSelectedDay = useSchedulerStore((state) => state.setSelectedDay);
  const setCalendarMonth = useSchedulerStore((state) => state.setCalendarMonth);
  const upsertAppointment = useSchedulerStore((state) => state.upsertAppointment);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDto | null>(null);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const isRouteFocusAppliedRef = useRef(false);
  const isRouteFocusOpenedRef = useRef(false);
  const routeFocus = useMemo(() => parseSchedulerFocusState(location.state), [location.state]);
  const {
    selectedDate,
    selectedDateLabel,
    summaryDateText,
    summaryCount,
  } = useSchedulerSummary({
    selectedDay,
    calendarYear,
    calendarMonth,
    monthAppointments,
    todayAppointmentsCount: todayAppointments.length,
    locale: i18n.language,
    t,
  });
  useSchedulerDataSync({
    calendarYear,
    calendarMonth,
    showErrorToast,
  });

  const {
    handleClaim,
    handleStatusChange,
    handleUnclaim,
    handleAdminAssign,
    handleAdminUnassign,
    handleCreateIntake,
    handleUpdateAppointment,
  } = useSchedulerActions({
    upsertAppointment,
    setSelectedAppointment,
    showSuccessToast,
    showErrorToast,
  });

  const handleCardClick = useCallback((appt: AppointmentDto) => setSelectedAppointment(appt), []);

  const handleDayClick = useCallback((day: number) => {
    const nextDay = selectedDay === day ? null : day;
    setSelectedDay(nextDay);
  }, [selectedDay, setSelectedDay]);

  const handleCloseModal = useCallback(() => setSelectedAppointment(null), []);

  const handleOpenIntake = useCallback(() => {
    if (!selectedDate) {
      showErrorToast('scheduler.intake.selectDayFirst');
      return;
    }

    setIsIntakeOpen(true);
  }, [selectedDate, showErrorToast]);

  const selectedAppointmentId = selectedAppointment?.id;

  useEffect(() => {
    if (routeFocus === null || isRouteFocusAppliedRef.current) {
      return;
    }

    const scheduledDate = new Date(routeFocus.focusScheduledDate);
    if (!Number.isNaN(scheduledDate.getTime())) {
      setCalendarMonth(scheduledDate.getFullYear(), scheduledDate.getMonth() + 1);
      setSelectedDay(scheduledDate.getDate());
    }

    isRouteFocusAppliedRef.current = true;
  }, [routeFocus, setCalendarMonth, setSelectedDay]);

  useEffect(() => {
    if (routeFocus === null || isRouteFocusOpenedRef.current) {
      return;
    }

    const focusedAppointment =
      monthAppointments.find((item) => item.id === routeFocus.focusAppointmentId)
      ?? todayAppointments.find((item) => item.id === routeFocus.focusAppointmentId);

    if (!focusedAppointment) {
      return;
    }

    const frameId = globalThis.requestAnimationFrame(() => {
      setSelectedAppointment(focusedAppointment);
      isRouteFocusOpenedRef.current = true;
    });

    return () => {
      globalThis.cancelAnimationFrame(frameId);
    };
  }, [monthAppointments, routeFocus, todayAppointments]);

  // Keep modal content in sync with the latest store snapshot.
  useEffect(() => {
    if (selectedAppointmentId === undefined) {
      return;
    }

    const latest =
      monthAppointments.find((item) => item.id === selectedAppointmentId)
      ?? todayAppointments.find((item) => item.id === selectedAppointmentId);

    if (!latest) {
      return;
    }

    const frameId = globalThis.requestAnimationFrame(() => {
      setSelectedAppointment((prev) => {
        if (prev?.id !== latest.id) {
          return prev;
        }

        return prev === latest ? prev : latest;
      });
    });

    return () => {
      globalThis.cancelAnimationFrame(frameId);
    };
  }, [selectedAppointmentId, monthAppointments, todayAppointments]);

  return (
    <section className={`${pageShellClass} flex flex-col gap-6`}>
      <h1 className="sr-only">{t('nav.scheduler')}</h1>

      <section aria-label={t('scheduler.plannerSpace')}>
        <h2 className="sr-only">{t('scheduler.plannerSpace')}</h2>
        <SchedulerSummaryStrip
          summaryDateText={summaryDateText}
          summaryCount={summaryCount}
          t={t}
        />
      </section>

      <section aria-label={t('nav.scheduler')}>
        <h2 className="sr-only">{t('nav.scheduler')}</h2>
        <CalendarView
          appointments={calendarAppointments}
          year={calendarYear}
          month={calendarMonth}
          isLoading={isLoadingMonth}
          onMonthChange={(year, month) => setCalendarMonth(year, month)}
          onDayClick={handleDayClick}
          selectedDay={selectedDay}
        />
      </section>

      <section aria-label={t('scheduler.intake.quickTitle')}>
        <h2 className="sr-only">{t('scheduler.intake.quickTitle')}</h2>
        <SchedulerQuickIntakeSection
          selectedDateLabel={selectedDateLabel}
          selectedDate={selectedDate}
          t={t}
          onOpenIntake={handleOpenIntake}
        />
      </section>

      <section aria-label={t('scheduler.monthList.title')}>
        <h2 className="sr-only">{t('scheduler.monthList.title')}</h2>
        <MonthAppointmentList
          appointments={monthAppointments}
          isLoading={isLoadingMonth}
          currentMechanicId={user?.personId}
          isAdmin={user?.isAdmin ?? false}
          selectedDay={selectedDay}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onCardClick={handleCardClick}
          onClearFilter={() => setSelectedDay(null)}
        />
      </section>

      <AppointmentDetailModal
        appointment={selectedAppointment}
        isOpen={selectedAppointment !== null}
        onClose={handleCloseModal}
        currentMechanicId={user?.personId}
        isAdmin={user?.isAdmin ?? false}
        onClaim={handleClaim}
        onStatusChange={handleStatusChange}
        onUnclaim={handleUnclaim}
        onAdminAssign={handleAdminAssign}
        onAdminUnassign={handleAdminUnassign}
        onUpdate={handleUpdateAppointment}
      />

      {selectedDate && (
        <SchedulerIntakeModal
          isOpen={isIntakeOpen}
          selectedDate={selectedDate}
          onClose={() => setIsIntakeOpen(false)}
          onSubmit={handleCreateIntake}
        />
      )}
    </section>
  );
});

SchedulerPageComponent.displayName = 'SchedulerPage';

/** Memoized scheduler page component exported for lazy-loading in the router. */
export const SchedulerPage = SchedulerPageComponent;
