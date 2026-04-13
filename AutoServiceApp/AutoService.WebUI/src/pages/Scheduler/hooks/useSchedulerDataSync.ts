import { useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { appointmentService } from '../../../services/scheduler/appointment.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import { useSchedulerStore } from '../../../store/scheduler.store';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';

interface UseSchedulerDataSyncArgs {
  readonly calendarYear: number;
  readonly calendarMonth: number;
  readonly showErrorToast: (key: string) => void;
}

function isAuthExpiredError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 401 || error.response?.status === 403;
}

export function useSchedulerDataSync({
  calendarYear,
  calendarMonth,
  showErrorToast,
}: UseSchedulerDataSyncArgs): void {
  const isBackgroundRefreshingRef = useRef(false);
  const backgroundRefreshTaskRef = useRef<() => Promise<void>>(async () => {});
  const currentMonthViewRef = useRef({
    year: calendarYear,
    month: calendarMonth,
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
      year: calendarYear,
      month: calendarMonth,
    };
  }, [calendarMonth, calendarYear]);

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
      } catch (error) {
        if (!cancelled) {
          showErrorToast(isAuthExpiredError(error) ? 'scheduler.todayAuthExpiredError' : 'scheduler.todayLoadError');
        }
      } finally {
        if (!cancelled && todayLoadingRequestIdRef.current === loadingRequestId) {
          useSchedulerStore.getState().setIsLoadingToday(false);
        }
      }
    };

    void fetchToday();
    return () => {
      cancelled = true;
    };
  }, [applyTodayAppointmentsIfCurrent, nextTodayDataRequestId, showErrorToast]);

  useEffect(() => {
    const requestedYear = calendarYear;
    const requestedMonth = calendarMonth;
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
      } catch (error) {
        if (!cancelled) {
          showErrorToast(isAuthExpiredError(error) ? 'scheduler.monthAuthExpiredError' : 'scheduler.monthLoadError');
        }
      } finally {
        if (!cancelled && monthLoadingRequestIdRef.current === loadingRequestId) {
          useSchedulerStore.getState().setIsLoadingMonth(false);
        }
      }
    };

    void fetchMonth();
    return () => {
      cancelled = true;
    };
  }, [
    applyMonthAppointmentsIfCurrent,
    calendarMonth,
    calendarYear,
    nextMonthDataRequestId,
    showErrorToast,
  ]);

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
      } catch (error) {
        if (!backgroundRefreshErrorShownRef.current) {
          showErrorToast(isAuthExpiredError(error) ? 'scheduler.monthAuthExpiredError' : 'scheduler.monthLoadError');
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

  useEffect(() => {
    const handleProfilePictureUpdated = () => {
      void backgroundRefreshTaskRef.current();
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    };
  }, []);
}
