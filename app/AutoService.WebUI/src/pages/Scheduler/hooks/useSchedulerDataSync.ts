/** Scheduler reads as declarative queries: the previous-current-next month window plus the real current month,
 * from which today is derived; refetched on a visible-tab interval, on focus and reconnect and on every live update. */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import {
  SCHEDULER_BACKGROUND_REFRESH_INTERVAL_MS,
  SCHEDULER_LIVE_REFRESH_INTERVAL_MS,
} from '../../../services/cache/cache-policy';
import type { AuthQueryScope } from '../../../services/cache/queryKeys';
import { schedulerQueries } from '../../../services/queries/scheduler.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import { isScheduledToday } from '../utils/scheduler-datetime';
import { foldReadStatus, isInitialLoading, type ReadStatus } from './readStatus';
import {
  EMPTY_APPOINTMENTS,
  getAdjacentMonthViews,
  getMonthViewOfDate,
  mergeUniqueAppointments,
  type CalendarMonthView,
} from './schedulerMonthWindow';
import { useIsAppointmentLiveConnected, useSchedulerLiveRefresh } from './useSchedulerLiveRefresh';

interface UseSchedulerDataSyncArgs {
  readonly calendarYear: number;
  readonly calendarMonth: number;
  readonly showErrorToast: (key: string) => void;
}

/** The server read models of the scheduler page. */
interface SchedulerAppointments {
  /** Appointments scheduled for today, found in the loaded months. */
  readonly todayAppointments: AppointmentDto[];
  readonly monthAppointments: AppointmentDto[];
  /** Appointments of the calendar grid: the viewed month plus its leading and trailing overflow days. */
  readonly calendarAppointments: AppointmentDto[];
  /** True until the whole month window has data or has failed. */
  readonly isLoadingMonth: boolean;
}

/** The message to toast for the month reads: none while they are not failing, the session one for an expired session. */
function toFailureMessageKey({ failure }: ReadStatus): string | null {
  if (failure === 'none') {
    return null;
  }

  return failure === 'auth-expired' ? 'scheduler.monthAuthExpiredError' : 'scheduler.monthLoadError';
}

/** The month read with the visible-tab background refresh; TanStack never runs the interval in a hidden tab. */
function monthReadOptions(scope: AuthQueryScope | null, view: CalendarMonthView, refetchInterval: number) {
  return {
    ...schedulerQueries.month(scope, view.year, view.month),
    refetchInterval,
  };
}

/** Reads the scheduler lists of the viewed month, keeps them fresh, and toasts a failed read once per episode. */
export function useSchedulerDataSync({
  calendarYear,
  calendarMonth,
  showErrorToast,
}: UseSchedulerDataSyncArgs): SchedulerAppointments {
  const scope = useAuthQueryScope();
  // While the live stream is open its events refresh the reads, so the interval is only a long safety net.
  const refetchInterval = useIsAppointmentLiveConnected()
    ? SCHEDULER_LIVE_REFRESH_INTERVAL_MS
    : SCHEDULER_BACKGROUND_REFRESH_INTERVAL_MS;
  const [previousView, currentView, nextView] = getAdjacentMonthViews(calendarYear, calendarMonth);

  const previousMonthQuery = useQuery(monthReadOptions(scope, previousView, refetchInterval));
  const currentMonthQuery = useQuery(monthReadOptions(scope, currentView, refetchInterval));
  const nextMonthQuery = useQuery(monthReadOptions(scope, nextView, refetchInterval));
  // The real current month: it shares a query with the window while inside it, and is one more read once the user paged away.
  const todayMonthQuery = useQuery(monthReadOptions(scope, getMonthViewOfDate(new Date()), refetchInterval));

  const previousMonth = previousMonthQuery.data ?? EMPTY_APPOINTMENTS;
  const currentMonth = currentMonthQuery.data ?? EMPTY_APPOINTMENTS;
  const nextMonth = nextMonthQuery.data ?? EMPTY_APPOINTMENTS;
  const todayMonth = todayMonthQuery.data ?? EMPTY_APPOINTMENTS;
  const calendarAppointments = useMemo(
    () => mergeUniqueAppointments(previousMonth, currentMonth, nextMonth),
    [previousMonth, currentMonth, nextMonth],
  );
  const todayAppointments = useMemo(
    () => mergeUniqueAppointments(calendarAppointments, todayMonth).filter(isScheduledToday),
    [calendarAppointments, todayMonth],
  );

  const monthReads = [previousMonthQuery, currentMonthQuery, nextMonthQuery];
  const monthStatus = foldReadStatus([...monthReads, todayMonthQuery]);

  useSchedulerLiveRefresh(scope);
  useReadFailureToast({
    failureMessageKey: toFailureMessageKey(monthStatus),
    errorUpdatedAt: monthStatus.errorAt,
    isSuccess: monthStatus.isSuccess,
    readKey: `${String(calendarYear)}-${String(calendarMonth)}`,
    showErrorToast,
  });

  return {
    todayAppointments,
    monthAppointments: currentMonth,
    calendarAppointments,
    isLoadingMonth: monthReads.some(isInitialLoading),
  };
}
