/** Scheduler page: composes the calendar/intake sections over the cached scheduler reads and opens the selected appointment. */
import { memo, useCallback, useState } from 'react';
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
import { useSchedulerRouteFocus } from './hooks/useSchedulerRouteFocus';
import { pageShellClass } from '../../utils/formStyles';

/** Finds an appointment by id in the first list that holds it; the selected one is read from the live lists. */
function findAppointmentById(
  appointmentId: number | null,
  appointmentLists: readonly (readonly AppointmentDto[])[],
): AppointmentDto | null {
  if (appointmentId === null) {
    return null;
  }

  for (const appointments of appointmentLists) {
    const match = appointments.find((appointment) => appointment.id === appointmentId);
    if (match !== undefined) {
      return match;
    }
  }

  return null;
}

const SchedulerPageComponent = memo(function SchedulerPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const showErrorToast = useToastStore((state) => state.showError);
  const calendarYear = useSchedulerStore((state) => state.calendarYear);
  const calendarMonth = useSchedulerStore((state) => state.calendarMonth);
  const selectedDay = useSchedulerStore((state) => state.selectedDay);
  const setSelectedDay = useSchedulerStore((state) => state.setSelectedDay);
  const setCalendarMonth = useSchedulerStore((state) => state.setCalendarMonth);
  const focusedAppointmentId = useSchedulerRouteFocus();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(focusedAppointmentId);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const {
    todayAppointments,
    monthAppointments,
    calendarAppointments,
    isLoadingMonth,
  } = useSchedulerDataSync({
    calendarYear,
    calendarMonth,
    showErrorToast,
  });
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

  const {
    handleClaim,
    handleStatusChange,
    handleUnclaim,
    handleAdminAssign,
    handleAdminUnassign,
    handleCreateIntake,
    handleUpdateAppointment,
    handleDelete,
  } = useSchedulerActions();

  // The open appointment is read from the live lists by id, so every cache write reaches the modal;
  // it closes by itself when the appointment is deleted.
  const selectedAppointment = findAppointmentById(selectedAppointmentId, [
    monthAppointments,
    todayAppointments,
    calendarAppointments,
  ]);

  const handleCardClick = useCallback((appointment: AppointmentDto) => {
    setSelectedAppointmentId(appointment.id);
  }, []);

  const handleDayClick = useCallback((day: number) => {
    const nextDay = selectedDay === day ? null : day;
    setSelectedDay(nextDay);
  }, [selectedDay, setSelectedDay]);

  const handleClearDayFilter = useCallback(() => {
    setSelectedDay(null);
  }, [setSelectedDay]);

  const handleCloseModal = useCallback(() => {
    setSelectedAppointmentId(null);
  }, []);

  const handleCloseIntake = useCallback(() => {
    setIsIntakeOpen(false);
  }, []);

  const handleOpenIntake = useCallback(() => {
    if (!selectedDate) {
      showErrorToast('scheduler.intake.selectDayFirst');
      return;
    }

    setIsIntakeOpen(true);
  }, [selectedDate, showErrorToast]);

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
          onMonthChange={setCalendarMonth}
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
          onClearFilter={handleClearDayFilter}
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
        onDelete={handleDelete}
      />

      {selectedDate && (
        <SchedulerIntakeModal
          isOpen={isIntakeOpen}
          selectedDate={selectedDate}
          onClose={handleCloseIntake}
          onSubmit={handleCreateIntake}
        />
      )}
    </section>
  );
});

SchedulerPageComponent.displayName = 'SchedulerPage';

export const SchedulerPage = SchedulerPageComponent;
