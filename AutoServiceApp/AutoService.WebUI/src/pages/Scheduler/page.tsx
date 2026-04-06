import { memo, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useSchedulerStore } from '../../store/scheduler.store';
import { useToastStore } from '../../store/toast.store';
import { appointmentService } from '../../services/appointment.service';
import type { AppointmentStatus } from '../../types/scheduler.types';
import { PlannerSpace } from './components/PlannerSpace';
import { CalendarView } from './components/CalendarView';

const SchedulerPageComponent = memo(function SchedulerPage() {
  const user = useAuthStore((state) => state.user);
  const showErrorToast = useToastStore((state) => state.showError);
  const store = useSchedulerStore();

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
    } catch {
      showErrorToast('scheduler.claimError');
    }
  }, [showErrorToast, store]);

  const handleStatusChange = useCallback(async (id: number, status: AppointmentStatus) => {
    try {
      const updated = await appointmentService.updateStatus(id, { status });
      store.upsertAppointment(updated);
    } catch {
      showErrorToast('scheduler.statusUpdateError');
    }
  }, [showErrorToast, store]);

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
      />
    </div>
  );
});

SchedulerPageComponent.displayName = 'SchedulerPage';

export const SchedulerPage = SchedulerPageComponent;