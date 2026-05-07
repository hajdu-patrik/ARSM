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
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

/**
 * Composes and coordinates the scheduler page sections and modal flows.
 * Keeps selected appointment content synchronized with store updates.
 */
const SchedulerPageComponent = memo(function SchedulerPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const store = useSchedulerStore();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDto | null>(null);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const {
    selectedDate,
    selectedDateLabel,
    summaryDateText,
    summaryCount,
  } = useSchedulerSummary({
    selectedDay: store.selectedDay,
    calendarYear: store.calendarYear,
    calendarMonth: store.calendarMonth,
    monthAppointments: store.monthAppointments,
    todayAppointmentsCount: store.todayAppointments.length,
    locale: i18n.language,
    t,
  });
  useSchedulerDataSync({
    calendarYear: store.calendarYear,
    calendarMonth: store.calendarMonth,
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
    upsertAppointment: store.upsertAppointment,
    setSelectedAppointment,
    showSuccessToast,
    showErrorToast,
  });

  const handleCardClick = useCallback((appt: AppointmentDto) => setSelectedAppointment(appt), []);

  const handleDayClick = useCallback((day: number) => {
    const nextDay = store.selectedDay === day ? null : day;
    store.setSelectedDay(nextDay);
  }, [store]);

  const handleCloseModal = useCallback(() => setSelectedAppointment(null), []);

  const handleOpenIntake = useCallback(() => {
    if (!selectedDate) {
      showErrorToast('scheduler.intake.selectDayFirst');
      return;
    }

    setIsIntakeOpen(true);
  }, [selectedDate, showErrorToast]);

  const selectedAppointmentId = selectedAppointment?.id;

  // Keep modal content in sync with the latest store snapshot.
  useEffect(() => {
    if (selectedAppointmentId === undefined) {
      return;
    }

    const latest =
      store.monthAppointments.find((item) => item.id === selectedAppointmentId)
      ?? store.todayAppointments.find((item) => item.id === selectedAppointmentId);

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
  }, [selectedAppointmentId, store.monthAppointments, store.todayAppointments]);

  return (
    <section className="flex flex-col gap-6 p-4 max-[320px]:p-3 sm:p-6 lg:p-8">
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
          appointments={store.calendarAppointments}
          year={store.calendarYear}
          month={store.calendarMonth}
          isLoading={store.isLoadingMonth}
          onMonthChange={(year, month) => store.setCalendarMonth(year, month)}
          onDayClick={handleDayClick}
          selectedDay={store.selectedDay}
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
          appointments={store.monthAppointments}
          isLoading={store.isLoadingMonth}
          currentMechanicId={user?.personId}
          selectedDay={store.selectedDay}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onCardClick={handleCardClick}
          onClearFilter={() => store.setSelectedDay(null)}
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
