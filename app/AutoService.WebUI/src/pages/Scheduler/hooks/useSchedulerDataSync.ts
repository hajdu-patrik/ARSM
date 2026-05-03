/**
 * Hook that orchestrates scheduler data fetching, background refresh,
 * and stale-data prevention.
 *
 * Fetches today's appointments once on mount, fetches the selected month
 * whenever `calendarYear`/`calendarMonth` change, and runs an 8-second
 * background poll for near-realtime claim/status updates. Uses request-id
 * and current-view refs to prevent stale-closure races and out-of-order
 * writes. Distinguishes auth-expired (401/403) from generic load failures
 * in error toasts. Listens for profile-picture-update SSE events to
 * trigger an immediate background refresh.
 *
 * @module useSchedulerDataSync
 */
import { useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { appointmentService } from '../../../services/scheduler/appointment.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import { useSchedulerStore } from '../../../store/scheduler.store';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';

/** Configuration for {@link useSchedulerDataSync}. */
interface UseSchedulerDataSyncArgs {
  /** Currently displayed calendar year. */
  readonly calendarYear: number;
  /** Currently displayed calendar month (1-based). */
  readonly calendarMonth: number;
  /** Displays an error toast by i18n key. */
  readonly showErrorToast: (key: string) => void;
}

/** Calendar view coordinates for a concrete month. */
interface CalendarMonthView {
  /** Calendar year. */
  readonly year: number;
  /** Calendar month (1-based). */
  readonly month: number;
}

/** Returns `true` when the error is an Axios 401 or 403 response (session expired). */
function isAuthExpiredError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 401 || error.response?.status === 403;
}

/**
 * Returns previous/current/next month views for the provided calendar month.
 *
 * @param year - Calendar year.
 * @param month - Calendar month (1-based).
 * @returns Adjacent views in prev-current-next order.
 */
function getAdjacentMonthViews(year: number, month: number): readonly [CalendarMonthView, CalendarMonthView, CalendarMonthView] {
  const currentDate = new Date(year, month - 1, 1);
  const previousDate = new Date(year, month - 2, 1);
  const nextDate = new Date(year, month, 1);

  return [
    { year: previousDate.getFullYear(), month: previousDate.getMonth() + 1 },
    { year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 },
    { year: nextDate.getFullYear(), month: nextDate.getMonth() + 1 },
  ];
}

/**
 * Merges appointment arrays and removes duplicates by appointment id.
 *
 * @param appointmentGroups - Appointment groups to flatten and de-duplicate.
 * @returns A de-duplicated list preserving first-seen order.
 */
function mergeUniqueAppointments(...appointmentGroups: readonly AppointmentDto[][]): AppointmentDto[] {
  const merged = new Map<number, AppointmentDto>();

  for (const group of appointmentGroups) {
    for (const appointment of group) {
      if (!merged.has(appointment.id)) {
        merged.set(appointment.id, appointment);
      }
    }
  }

  return Array.from(merged.values());
}

/**
 * Manages today and month appointment data loading, background polling,
 * and stale-request guards for the scheduler page.
 */
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

  const applyCalendarAppointmentsIfCurrent = useCallback(
    (requestId: number, year: number, month: number, appointments: AppointmentDto[]) => {
      const currentView = currentMonthViewRef.current;
      if (
        monthDataRequestIdRef.current !== requestId ||
        currentView.year !== year ||
        currentView.month !== month
      ) {
        return;
      }

      useSchedulerStore.getState().setCalendarAppointments(appointments);
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
        const [prevView, currentView, nextView] = getAdjacentMonthViews(requestedYear, requestedMonth);
        const [previousMonthAppointments, currentMonthAppointments, nextMonthAppointments] = await Promise.all([
          appointmentService.getByMonth(prevView.year, prevView.month),
          appointmentService.getByMonth(currentView.year, currentView.month),
          appointmentService.getByMonth(nextView.year, nextView.month),
        ]);

        const calendarAppointments = mergeUniqueAppointments(
          previousMonthAppointments,
          currentMonthAppointments,
          nextMonthAppointments,
        );

        if (!cancelled) {
          applyMonthAppointmentsIfCurrent(
            dataRequestId,
            requestedYear,
            requestedMonth,
            currentMonthAppointments,
          );
          applyCalendarAppointmentsIfCurrent(
            dataRequestId,
            requestedYear,
            requestedMonth,
            calendarAppointments,
          );
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
    applyCalendarAppointmentsIfCurrent,
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
        const [prevView, currentView, nextView] = getAdjacentMonthViews(
          requestedView.year,
          requestedView.month,
        );
        const [today, previousMonthAppointments, currentMonthAppointments, nextMonthAppointments] = await Promise.all([
          appointmentService.getToday(),
          appointmentService.getByMonth(prevView.year, prevView.month),
          appointmentService.getByMonth(currentView.year, currentView.month),
          appointmentService.getByMonth(nextView.year, nextView.month),
        ]);
        const calendarAppointments = mergeUniqueAppointments(
          previousMonthAppointments,
          currentMonthAppointments,
          nextMonthAppointments,
        );

        applyTodayAppointmentsIfCurrent(todayRequestId, today);
        applyMonthAppointmentsIfCurrent(
          monthRequestId,
          requestedView.year,
          requestedView.month,
          currentMonthAppointments,
        );
        applyCalendarAppointmentsIfCurrent(
          monthRequestId,
          requestedView.year,
          requestedView.month,
          calendarAppointments,
        );
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
    applyCalendarAppointmentsIfCurrent,
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
