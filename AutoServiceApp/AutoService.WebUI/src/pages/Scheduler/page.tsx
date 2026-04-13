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
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 h-full overflow-auto">
      <SchedulerSummaryStrip
        summaryDateText={summaryDateText}
        summaryCount={summaryCount}
        t={t}
      />

      <CalendarView
        appointments={store.monthAppointments}
        year={store.calendarYear}
        month={store.calendarMonth}
        isLoading={store.isLoadingMonth}
        onMonthChange={(year, month) => store.setCalendarMonth(year, month)}
        onDayClick={handleDayClick}
        selectedDay={store.selectedDay}
      />

      <SchedulerQuickIntakeSection
        selectedDateLabel={selectedDateLabel}
        selectedDate={selectedDate}
        t={t}
        onOpenIntake={handleOpenIntake}
      />

      <MonthAppointmentList
        appointments={store.monthAppointments}
        isLoading={store.isLoadingMonth}
        currentMechanicId={user?.personId}
        selectedDay={store.selectedDay}
        onClaim={handleClaim}
        onCardClick={handleCardClick}
        onClearFilter={() => store.setSelectedDay(null)}
      />

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
    </div>
  );
});

SchedulerPageComponent.displayName = 'SchedulerPage';

export const SchedulerPage = SchedulerPageComponent;
