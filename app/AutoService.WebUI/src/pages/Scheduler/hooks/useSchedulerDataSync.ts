/** Scheduler data sync: Zustand as the UI projection layer over TanStack Query's cache; stale-time/visible-tab refresh policy per CLAUDE.md. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { appointmentService } from '../../../services/scheduler/appointment.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import {
  APPOINTMENT_UPDATED_EVENT,
  startAppointmentLiveUpdates,
} from '../../../services/scheduler/appointment-live.service';
import {
  PERSISTED_QUERY_CACHE_MAX_AGE_MS,
  SCHEDULER_BACKGROUND_REFRESH_INTERVAL_MS,
  SCHEDULER_MONTH_STALE_TIME_MS,
  SCHEDULER_TODAY_STALE_TIME_MS,
} from '../../../services/cache/cache-policy';
import { getAuthQueryScope, queryKeys, type AuthQueryScope } from '../../../services/cache/queryKeys';
import { useSchedulerStore } from '../../../store/scheduler.store';
import { useAuthStore } from '../../../store/auth.store';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';

/** Dependencies needed by the scheduler data synchronization hook. */
interface UseSchedulerDataSyncArgs {
  readonly calendarYear: number;
  readonly calendarMonth: number;
  readonly showErrorToast: (key: string) => void;
}

/** Calendar coordinates for one scheduler month query. */
interface CalendarMonthView {
  readonly year: number;
  readonly month: number;
}

/** True when an error represents an expired/forbidden auth session (Axios 401/403). */
function isAuthExpiredError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 401 || error.response?.status === 403;
}

/** True when background refresh should run: outside the browser, or the document tab is visible. */
function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

/** Builds the previous-current-next month window used to hydrate the scheduler calendar grid. */
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

/** Merges appointment groups, keeping the first occurrence of each appointment id. */
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

/** Fetches today's appointments through TanStack Query using the shared scheduler cache policy. */
async function fetchTodayAppointments(
  queryClient: QueryClient,
  authScope: AuthQueryScope,
  forceRefresh = false,
): Promise<AppointmentDto[]> {
  const queryKey = queryKeys.scheduler.today(authScope);

  if (forceRefresh) {
    await queryClient.invalidateQueries({ queryKey, exact: true });
  }

  return queryClient.fetchQuery({
    gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
    queryFn: () => appointmentService.getToday({ skipErrorRedirect: forceRefresh }),
    queryKey,
    staleTime: SCHEDULER_TODAY_STALE_TIME_MS,
  });
}

/** Fetches one scheduler month through TanStack Query using the shared month cache policy. */
async function fetchMonthAppointments(
  queryClient: QueryClient,
  authScope: AuthQueryScope,
  view: CalendarMonthView,
  forceRefresh = false,
): Promise<AppointmentDto[]> {
  const queryKey = queryKeys.scheduler.month(authScope, view.year, view.month);

  if (forceRefresh) {
    await queryClient.invalidateQueries({ queryKey, exact: true });
  }

  return queryClient.fetchQuery({
    gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
    queryFn: () => appointmentService.getByMonth(view.year, view.month, { skipErrorRedirect: forceRefresh }),
    queryKey,
    staleTime: SCHEDULER_MONTH_STALE_TIME_MS,
  });
}

/** Reads a cached scheduler month without triggering a network request. */
function readCachedMonthAppointments(
  queryClient: QueryClient,
  authScope: AuthQueryScope,
  view: CalendarMonthView,
): AppointmentDto[] | undefined {
  return queryClient.getQueryData<AppointmentDto[]>(queryKeys.scheduler.month(authScope, view.year, view.month));
}

/** Synchronizes scheduler store projections from private query-cache reads and background refreshes. */
export function useSchedulerDataSync({
  calendarYear,
  calendarMonth,
  showErrorToast,
}: UseSchedulerDataSyncArgs): void {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const authScope = useMemo(() => getAuthQueryScope(authUser), [authUser]);

  const isBackgroundRefreshingRef = useRef(false);
  const refreshRequestedWhileRunningRef = useRef(false);
  const backgroundRefreshTaskRef = useRef<() => Promise<void>>(async () => {});
  const currentMonthViewRef = useRef({ year: calendarYear, month: calendarMonth });

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

  const applyMonthAppointmentsIfCurrent = useCallback((
    requestId: number,
    year: number,
    month: number,
    appointments: AppointmentDto[],
  ) => {
    const currentView = currentMonthViewRef.current;
    if (monthDataRequestIdRef.current !== requestId || currentView.year !== year || currentView.month !== month) {
      return;
    }

    useSchedulerStore.getState().setMonthAppointments(appointments);
  }, []);

  const applyCalendarAppointmentsIfCurrent = useCallback((
    requestId: number,
    year: number,
    month: number,
    appointments: AppointmentDto[],
  ) => {
    const currentView = currentMonthViewRef.current;
    if (monthDataRequestIdRef.current !== requestId || currentView.year !== year || currentView.month !== month) {
      return;
    }

    useSchedulerStore.getState().setCalendarAppointments(appointments);
  }, []);

  useEffect(() => {
    currentMonthViewRef.current = { year: calendarYear, month: calendarMonth };
  }, [calendarMonth, calendarYear]);

  useEffect(() => {
    if (!authScope) {
      useSchedulerStore.getState().setTodayAppointments([]);
      useSchedulerStore.getState().setIsLoadingToday(false);
      return;
    }

    let cancelled = false;
    const loadingRequestId = ++todayLoadingRequestIdRef.current;
    const dataRequestId = nextTodayDataRequestId();
    const cachedToday = queryClient.getQueryData<AppointmentDto[]>(queryKeys.scheduler.today(authScope));
    const schedulerState = useSchedulerStore.getState();

    schedulerState.setIsLoadingToday(!cachedToday);
    schedulerState.setError(null);

    if (cachedToday) {
      applyTodayAppointmentsIfCurrent(dataRequestId, cachedToday);
    }

    const fetchToday = async () => {
      try {
        const data = await fetchTodayAppointments(queryClient, authScope);
        if (!cancelled) {
          applyTodayAppointmentsIfCurrent(dataRequestId, data);
        }
      } catch (error) {
        if (!cancelled && !cachedToday) {
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
  }, [applyTodayAppointmentsIfCurrent, authScope, nextTodayDataRequestId, queryClient, showErrorToast]);

  useEffect(() => {
    if (!authScope) {
      useSchedulerStore.getState().setMonthAppointments([]);
      useSchedulerStore.getState().setCalendarAppointments([]);
      useSchedulerStore.getState().setIsLoadingMonth(false);
      return;
    }

    const requestedYear = calendarYear;
    const requestedMonth = calendarMonth;
    const adjacentViews = getAdjacentMonthViews(requestedYear, requestedMonth);
    currentMonthViewRef.current = { year: requestedYear, month: requestedMonth };
    let cancelled = false;

    const loadingRequestId = ++monthLoadingRequestIdRef.current;
    const dataRequestId = nextMonthDataRequestId();
    const cachedMonthGroups = adjacentViews.map((view) => readCachedMonthAppointments(queryClient, authScope, view));
    const hasCompleteCachedMonthWindow = cachedMonthGroups.every((group): group is AppointmentDto[] => group !== undefined);

    useSchedulerStore.getState().setIsLoadingMonth(!hasCompleteCachedMonthWindow);

    if (hasCompleteCachedMonthWindow) {
      applyMonthAppointmentsIfCurrent(dataRequestId, requestedYear, requestedMonth, cachedMonthGroups[1]);
      applyCalendarAppointmentsIfCurrent(
        dataRequestId,
        requestedYear,
        requestedMonth,
        mergeUniqueAppointments(...cachedMonthGroups),
      );
    }

    const fetchMonth = async () => {
      try {
        const [previousMonthAppointments, currentMonthAppointments, nextMonthAppointments] = await Promise.all(
          adjacentViews.map((view) => fetchMonthAppointments(queryClient, authScope, view)),
        );
        const calendarAppointments = mergeUniqueAppointments(
          previousMonthAppointments,
          currentMonthAppointments,
          nextMonthAppointments,
        );

        if (!cancelled) {
          applyMonthAppointmentsIfCurrent(dataRequestId, requestedYear, requestedMonth, currentMonthAppointments);
          applyCalendarAppointmentsIfCurrent(dataRequestId, requestedYear, requestedMonth, calendarAppointments);
        }
      } catch (error) {
        if (!cancelled && !hasCompleteCachedMonthWindow) {
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
    authScope,
    calendarMonth,
    calendarYear,
    nextMonthDataRequestId,
    queryClient,
    showErrorToast,
  ]);

  useEffect(() => {
    /** Runs one refresh pass; a trigger that arrives mid-pass only flags a rerun (see below) instead of overlapping, so no live update is dropped. */
    const runRefreshPass = async (currentAuthScope: AuthQueryScope) => {
      const requestedView = currentMonthViewRef.current;
      const todayRequestId = nextTodayDataRequestId();
      const monthRequestId = nextMonthDataRequestId();

      try {
        const adjacentViews = getAdjacentMonthViews(requestedView.year, requestedView.month);
        const [today, previousMonthAppointments, currentMonthAppointments, nextMonthAppointments] = await Promise.all([
          fetchTodayAppointments(queryClient, currentAuthScope, true),
          ...adjacentViews.map((view) => fetchMonthAppointments(queryClient, currentAuthScope, view, true)),
        ]);
        const calendarAppointments = mergeUniqueAppointments(
          previousMonthAppointments,
          currentMonthAppointments,
          nextMonthAppointments,
        );

        applyTodayAppointmentsIfCurrent(todayRequestId, today);
        applyMonthAppointmentsIfCurrent(monthRequestId, requestedView.year, requestedView.month, currentMonthAppointments);
        applyCalendarAppointmentsIfCurrent(monthRequestId, requestedView.year, requestedView.month, calendarAppointments);
        backgroundRefreshErrorShownRef.current = false;
      } catch (error) {
        if (!backgroundRefreshErrorShownRef.current) {
          showErrorToast(isAuthExpiredError(error) ? 'scheduler.monthAuthExpiredError' : 'scheduler.monthLoadError');
          backgroundRefreshErrorShownRef.current = true;
        }
      }
    };

    backgroundRefreshTaskRef.current = async () => {
      if (!authScope) {
        return;
      }

      if (isBackgroundRefreshingRef.current) {
        // A pass is already in flight: remember that this trigger's change still needs a fetch
        // instead of dropping it, so a live update that arrives mid-refresh is never lost.
        refreshRequestedWhileRunningRef.current = true;
        return;
      }

      isBackgroundRefreshingRef.current = true;
      try {
        do {
          refreshRequestedWhileRunningRef.current = false;
          await runRefreshPass(authScope);
        } while (refreshRequestedWhileRunningRef.current);
      } finally {
        isBackgroundRefreshingRef.current = false;
      }
    };
  }, [
    applyCalendarAppointmentsIfCurrent,
    applyMonthAppointmentsIfCurrent,
    applyTodayAppointmentsIfCurrent,
    authScope,
    nextMonthDataRequestId,
    nextTodayDataRequestId,
    queryClient,
    showErrorToast,
  ]);

  useEffect(() => {
    const intervalId = globalThis.setInterval(() => {
      if (isDocumentVisible()) {
        void backgroundRefreshTaskRef.current();
      }
    }, SCHEDULER_BACKGROUND_REFRESH_INTERVAL_MS);

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

  // Another user's appointment change arrives over SSE instead of waiting for the periodic
  // background refresh. The stream is opened only while the scheduler is mounted.
  useEffect(() => {
    const handleAppointmentUpdated = () => {
      void backgroundRefreshTaskRef.current();
    };

    const stopAppointmentLiveUpdates = startAppointmentLiveUpdates();
    globalThis.addEventListener(APPOINTMENT_UPDATED_EVENT, handleAppointmentUpdated);

    return () => {
      globalThis.removeEventListener(APPOINTMENT_UPDATED_EVENT, handleAppointmentUpdated);
      stopAppointmentLiveUpdates();
    };
  }, []);
}
