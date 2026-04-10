import { memo, useEffect, useCallback, useRef, useState, useMemo } from 'react';
import type { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useSchedulerStore } from '../../store/scheduler.store';
import { useToastStore } from '../../store/toast.store';
import { appointmentService } from '../../services/appointment.service';
import type {
  AppointmentDto,
  AppointmentStatus,
  SchedulerCreateIntakeRequest,
  UpdateAppointmentRequest,
} from '../../types/scheduler.types';
import { CalendarView } from './components/CalendarView';
import { MonthAppointmentList } from './components/MonthAppointmentList';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import { SchedulerIntakeModal } from './components/SchedulerIntakeModal';

const SchedulerPageComponent = memo(function SchedulerPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const store = useSchedulerStore();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDto | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const isBackgroundRefreshingRef = useRef(false);
  const backgroundRefreshTaskRef = useRef<() => Promise<void>>(async () => {});
  const currentMonthViewRef = useRef({
    year: store.calendarYear,
    month: store.calendarMonth,
  });
  const todayDataRequestIdRef = useRef(0);
  const monthDataRequestIdRef = useRef(0);
  const todayLoadingRequestIdRef = useRef(0);
  const monthLoadingRequestIdRef = useRef(0);
  const backgroundRefreshErrorShownRef = useRef(false);

  const nextTodayDataRequestId = useCallback(() => {
    todayDataRequestIdRef.current += 1;
    return todayDataRequestIdRef.current;
  }, []);

  const nextMonthDataRequestId = useCallback(() => {
    monthDataRequestIdRef.current += 1;
    return monthDataRequestIdRef.current;
  }, []);

  const applyTodayAppointmentsIfCurrent = useCallback((requestId: number, appointments: AppointmentDto[]) => {
    if (todayDataRequestIdRef.current !== requestId) {
      return;
    }

    useSchedulerStore.getState().setTodayAppointments(appointments);
  }, []);

  const applyMonthAppointmentsIfCurrent = useCallback(
    (requestId: number, year: number, month: number, appointments: AppointmentDto[]) => {
      const currentView = currentMonthViewRef.current;
      if (
        monthDataRequestIdRef.current !== requestId ||
        currentView.year !== year ||
        currentView.month !== month
      ) {
        return;
      }

      useSchedulerStore.getState().setMonthAppointments(appointments);
    },
    [],
  );

  useEffect(() => {
    currentMonthViewRef.current = {
      year: store.calendarYear,
      month: store.calendarMonth,
    };
  }, [store.calendarMonth, store.calendarYear]);

  const selectedDate = useMemo(() => {
    if (selectedDay === null) {
      return null;
    }

    return new Date(store.calendarYear, store.calendarMonth - 1, selectedDay);
  }, [selectedDay, store.calendarMonth, store.calendarYear]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) {
      return null;
    }

    return new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(selectedDate);
  }, [i18n.language, selectedDate]);

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }, [i18n.language]);

  const summaryDateText = useMemo(() => {
    if (selectedDateLabel) {
      return t('scheduler.selectedDate', { date: selectedDateLabel });
    }

    return t('scheduler.todayDate', { date: todayFormatted });
  }, [selectedDateLabel, t, todayFormatted]);

  const summaryCount = useMemo(() => {
    if (!selectedDate) {
      return store.todayAppointments.length;
    }

    return store.monthAppointments.filter((appointment) => {
      const scheduled = new Date(appointment.scheduledDate);
      return scheduled.getFullYear() === selectedDate.getFullYear() &&
        scheduled.getMonth() === selectedDate.getMonth() &&
        scheduled.getDate() === selectedDate.getDate();
    }).length;
  }, [selectedDate, store.monthAppointments, store.todayAppointments.length]);

  // Fetch today's appointments on mount
  useEffect(() => {
    let cancelled = false;

    const fetchToday = async () => {
      const loadingRequestId = ++todayLoadingRequestIdRef.current;
      const dataRequestId = nextTodayDataRequestId();
      const schedulerState = useSchedulerStore.getState();

      schedulerState.setIsLoadingToday(true);
      schedulerState.setError(null);

      try {
        const data = await appointmentService.getToday();
        if (!cancelled) {
          applyTodayAppointmentsIfCurrent(dataRequestId, data);
        }
      } catch {
        if (!cancelled) {
          showErrorToast('scheduler.todayLoadError');
        }
      } finally {
        if (!cancelled && todayLoadingRequestIdRef.current === loadingRequestId) {
          useSchedulerStore.getState().setIsLoadingToday(false);
        }
      }
    };

    void fetchToday();
    return () => { cancelled = true; };
  }, [applyTodayAppointmentsIfCurrent, nextTodayDataRequestId, showErrorToast]);

  // Fetch month appointments when calendar month changes
  useEffect(() => {
    setSelectedDay(null);
    const requestedYear = store.calendarYear;
    const requestedMonth = store.calendarMonth;
    currentMonthViewRef.current = { year: requestedYear, month: requestedMonth };
    let cancelled = false;

    const fetchMonth = async () => {
      const loadingRequestId = ++monthLoadingRequestIdRef.current;
      const dataRequestId = nextMonthDataRequestId();
      const schedulerState = useSchedulerStore.getState();

      schedulerState.setIsLoadingMonth(true);

      try {
        const data = await appointmentService.getByMonth(requestedYear, requestedMonth);
        if (!cancelled) {
          applyMonthAppointmentsIfCurrent(dataRequestId, requestedYear, requestedMonth, data);
        }
      } catch {
        if (!cancelled) {
          showErrorToast('scheduler.monthLoadError');
        }
      } finally {
        if (!cancelled && monthLoadingRequestIdRef.current === loadingRequestId) {
          useSchedulerStore.getState().setIsLoadingMonth(false);
        }
      }
    };

    void fetchMonth();
    return () => { cancelled = true; };
  }, [
    applyMonthAppointmentsIfCurrent,
    nextMonthDataRequestId,
    showErrorToast,
    store.calendarMonth,
    store.calendarYear,
  ]);

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

  const handleOpenIntake = useCallback(() => {
    if (!selectedDate) {
      showErrorToast('scheduler.intake.selectDayFirst');
      return;
    }

    setIsIntakeOpen(true);
  }, [selectedDate, showErrorToast]);

  const handleCreateIntake = useCallback(async (request: SchedulerCreateIntakeRequest) => {
    const created = await appointmentService.createIntake(request);
    store.upsertAppointment(created);
    showSuccessToast('scheduler.intake.createSuccess');
  }, [showSuccessToast, store]);

  const handleUpdateAppointment = useCallback(async (id: number, request: UpdateAppointmentRequest) => {
    const updated = await appointmentService.updateAppointment(id, request);
    store.upsertAppointment(updated);
    setSelectedAppointment(updated);
    showSuccessToast('scheduler.detail.updateSuccess');
  }, [showSuccessToast, store]);

  const selectedAppointmentId = selectedAppointment?.id;

  // Keep modal content in sync with the latest store snapshot.
  useEffect(() => {
    if (selectedAppointmentId === undefined) {
      return;
    }

    const latest =
      store.monthAppointments.find((item) => item.id === selectedAppointmentId)
      ?? store.todayAppointments.find((item) => item.id === selectedAppointmentId);

    if (latest) {
      setSelectedAppointment((prev) => {
        if (prev?.id !== latest.id) {
          return prev;
        }

        return prev === latest ? prev : latest;
      });
    }
  }, [selectedAppointmentId, store.monthAppointments, store.todayAppointments]);

  // Background refresh keeps appointment claim/status updates realtime for open list + modal.
  useEffect(() => {
    backgroundRefreshTaskRef.current = async () => {
      if (isBackgroundRefreshingRef.current) {
        return;
      }

      const requestedView = currentMonthViewRef.current;
      const todayRequestId = nextTodayDataRequestId();
      const monthRequestId = nextMonthDataRequestId();

      isBackgroundRefreshingRef.current = true;
      try {
        const [today, month] = await Promise.all([
          appointmentService.getToday(),
          appointmentService.getByMonth(requestedView.year, requestedView.month),
        ]);

        applyTodayAppointmentsIfCurrent(todayRequestId, today);
        applyMonthAppointmentsIfCurrent(monthRequestId, requestedView.year, requestedView.month, month);
        backgroundRefreshErrorShownRef.current = false;
      } catch {
        if (!backgroundRefreshErrorShownRef.current) {
          showErrorToast('scheduler.monthLoadError');
          backgroundRefreshErrorShownRef.current = true;
        }
      } finally {
        isBackgroundRefreshingRef.current = false;
      }
    };
  }, [
    applyMonthAppointmentsIfCurrent,
    applyTodayAppointmentsIfCurrent,
    nextMonthDataRequestId,
    nextTodayDataRequestId,
    showErrorToast,
  ]);

  useEffect(() => {
    const intervalId = globalThis.setInterval(() => {
      void backgroundRefreshTaskRef.current();
    }, 8000);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 h-full overflow-auto">
      <section className="rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] px-4 py-3 shadow-sm dark:border-[#3A3154] dark:bg-[#13131B]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-[#2C2440] dark:text-[#EDE8FA]">
            {summaryDateText}
          </p>
          <span className="inline-flex items-center rounded-full bg-[#EFEBFA] px-3 py-1 text-xs font-medium text-[#2C2440] dark:bg-[#241F33] dark:text-[#F5F2FF]">
            {t('scheduler.scheduledCount', { count: summaryCount })}
          </span>
        </div>
      </section>

      <CalendarView
        appointments={store.monthAppointments}
        year={store.calendarYear}
        month={store.calendarMonth}
        isLoading={store.isLoadingMonth}
        onMonthChange={(year, month) => store.setCalendarMonth(year, month)}
        onDayClick={handleDayClick}
        selectedDay={selectedDay}
      />

      <section className="rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] p-4 shadow-sm dark:border-[#3A3154] dark:bg-[#13131B]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#2C2440] dark:text-[#EDE8FA]">{t('scheduler.intake.quickTitle')}</h3>
            <p className="text-sm text-[#6A627F] dark:text-[#B9B0D3]">
              {selectedDateLabel
                ? t('scheduler.intake.quickSelectedDay', { date: selectedDateLabel })
                : t('scheduler.intake.quickSelectDayHint')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenIntake}
            disabled={selectedDate === null}
            className="inline-flex items-center justify-center rounded-xl bg-[#C9B3FF] px-4 py-2 text-sm font-semibold text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6]"
          >
            {t('scheduler.intake.open')}
          </button>
        </div>
      </section>

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
