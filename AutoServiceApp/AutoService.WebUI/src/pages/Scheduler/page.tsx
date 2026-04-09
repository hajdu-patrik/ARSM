import { memo, useEffect, useCallback, useRef, useState } from 'react';
import type { AxiosError } from 'axios';
import { useAuthStore } from '../../store/auth.store';
import { useSchedulerStore } from '../../store/scheduler.store';
import { useToastStore } from '../../store/toast.store';
import { appointmentService } from '../../services/appointment.service';
import type { AppointmentDto, AppointmentStatus } from '../../types/scheduler.types';
import { PlannerSpace } from './components/PlannerSpace';
import { CalendarView } from './components/CalendarView';
import { MonthAppointmentList } from './components/MonthAppointmentList';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';

const SchedulerPageComponent = memo(function SchedulerPage() {
  const user = useAuthStore((state) => state.user);
  const showErrorToast = useToastStore((state) => state.showError);
  const store = useSchedulerStore();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDto | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const isBackgroundRefreshingRef = useRef(false);

  // Fetch today's appointments on mount
  useEffect(() => {
    let cancelled = false;

    const fetchToday = async () => {
      store.setIsLoadingToday(true);
      store.setError(null);
      try {
        const data = await appointmentService.getToday();
        if (!cancelled) {
          store.setTodayAppointments(data);
        }
      } catch {
        if (!cancelled) {
          showErrorToast('scheduler.todayLoadError');
        }
      } finally {
        if (!cancelled) {
          store.setIsLoadingToday(false);
        }
      }
    };

    void fetchToday();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch month appointments when calendar month changes
  useEffect(() => {
    setSelectedDay(null);
    let cancelled = false;

    const fetchMonth = async () => {
      store.setIsLoadingMonth(true);
      try {
        const data = await appointmentService.getByMonth(store.calendarYear, store.calendarMonth);
        if (!cancelled) {
          store.setMonthAppointments(data);
        }
      } catch {
        if (!cancelled) {
          showErrorToast('scheduler.monthLoadError');
        }
      } finally {
        if (!cancelled) {
          store.setIsLoadingMonth(false);
        }
      }
    };

    void fetchMonth();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.calendarYear, store.calendarMonth]);

  const handleClaim = useCallback(async (id: number) => {
    try {
      const updated = await appointmentService.claim(id);
      store.upsertAppointment(updated);
      setSelectedAppointment((prev) => (prev?.id === updated.id ? updated : prev));
    } catch {
      showErrorToast('scheduler.claimError');
    }
  }, [showErrorToast, store]);

  const handleStatusChange = useCallback(async (id: number, status: AppointmentStatus) => {
    try {
      const updated = await appointmentService.updateStatus(id, { status });
      store.upsertAppointment(updated);
      setSelectedAppointment((prev) => (prev?.id === updated.id ? updated : prev));
    } catch {
      showErrorToast('scheduler.statusUpdateError');
    }
  }, [showErrorToast, store]);

  const handleUnclaim = useCallback(async (id: number) => {
    try {
      const updated = await appointmentService.unclaim(id);
      store.upsertAppointment(updated);
      setSelectedAppointment(updated);
    } catch (err) {
      const axiosError = err as AxiosError<{ code?: string }>;
      const apiCode = axiosError.response?.data?.code;

      if (apiCode === 'appointment_cancelled') {
        showErrorToast('scheduler.detail.unassignCancelledError');
        return;
      }

      showErrorToast('scheduler.detail.unassignError');
    }
  }, [showErrorToast, store]);

  const handleAdminAssign = useCallback(async (appointmentId: number, mechanicId: number) => {
    try {
      const updated = await appointmentService.adminAssign(appointmentId, mechanicId);
      store.upsertAppointment(updated);
      setSelectedAppointment(updated);
    } catch {
      showErrorToast('scheduler.detail.assignError');
    }
  }, [showErrorToast, store]);

  const handleAdminUnassign = useCallback(async (appointmentId: number, mechanicId: number) => {
    try {
      const updated = await appointmentService.adminUnassign(appointmentId, mechanicId);
      store.upsertAppointment(updated);
      setSelectedAppointment(updated);
    } catch {
      showErrorToast('scheduler.detail.adminUnassignError');
    }
  }, [showErrorToast, store]);

  const handleCardClick = useCallback((appt: AppointmentDto) => setSelectedAppointment(appt), []);

  const handleDayClick = useCallback((day: number) => setSelectedDay((prev) => prev === day ? null : day), []);

  const handleCloseModal = useCallback(() => setSelectedAppointment(null), []);

  // Keep modal content in sync with the latest store snapshot.
  useEffect(() => {
    if (!selectedAppointment) {
      return;
    }

    const latest =
      store.monthAppointments.find((item) => item.id === selectedAppointment.id)
      ?? store.todayAppointments.find((item) => item.id === selectedAppointment.id);

    if (latest) {
      setSelectedAppointment((prev) => (prev?.id === latest.id ? latest : prev));
    }
  }, [selectedAppointment, store.monthAppointments, store.todayAppointments]);

  // Background refresh keeps appointment claim/status updates realtime for open list + modal.
  useEffect(() => {
    let cancelled = false;

    const refreshSchedulerData = async () => {
      if (isBackgroundRefreshingRef.current) {
        return;
      }

      isBackgroundRefreshingRef.current = true;
      try {
        const [today, month] = await Promise.all([
          appointmentService.getToday(),
          appointmentService.getByMonth(store.calendarYear, store.calendarMonth),
        ]);

        if (cancelled) {
          return;
        }

        store.setTodayAppointments(today);
        store.setMonthAppointments(month);
      } catch {
        // Keep UI stable on transient refresh failures.
      } finally {
        isBackgroundRefreshingRef.current = false;
      }
    };

    const intervalId = globalThis.setInterval(() => {
      void refreshSchedulerData();
    }, 8000);

    return () => {
      cancelled = true;
      globalThis.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.calendarYear, store.calendarMonth]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 h-full overflow-auto">
      <PlannerSpace
        appointments={store.todayAppointments}
        isLoading={store.isLoadingToday}
        currentMechanicId={user?.personId}
        onClaim={handleClaim}
        onStatusChange={handleStatusChange}
      />

      <CalendarView
        appointments={store.monthAppointments}
        year={store.calendarYear}
        month={store.calendarMonth}
        isLoading={store.isLoadingMonth}
        onMonthChange={(year, month) => store.setCalendarMonth(year, month)}
        onDayClick={handleDayClick}
        selectedDay={selectedDay}
      />

      <MonthAppointmentList
        appointments={store.monthAppointments}
        isLoading={store.isLoadingMonth}
        currentMechanicId={user?.personId}
        selectedDay={selectedDay}
        onClaim={handleClaim}
        onStatusChange={handleStatusChange}
        onCardClick={handleCardClick}
        onClearFilter={() => setSelectedDay(null)}
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
      />
    </div>
  );
});

SchedulerPageComponent.displayName = 'SchedulerPage';

export const SchedulerPage = SchedulerPageComponent;
