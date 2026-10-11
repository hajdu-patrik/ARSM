/** Scheduler reads as declarative queries: today and the previous-current-next month window, refetched on a
 * visible-tab interval, on focus and reconnect, and on every live update. */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { SCHEDULER_BACKGROUND_REFRESH_INTERVAL_MS } from '../../../services/cache/cache-policy';
import type { AuthQueryScope } from '../../../services/cache/queryKeys';
import { schedulerQueries } from '../../../services/queries/scheduler.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import { foldReadStatus, isInitialLoading, type ReadStatus } from './readStatus';
import {
  EMPTY_APPOINTMENTS,
  getAdjacentMonthViews,
  mergeUniqueAppointments,
  type CalendarMonthView,
} from './schedulerMonthWindow';
import { useSchedulerLiveRefresh } from './useSchedulerLiveRefresh';

/** Dependencies needed by the scheduler data hook. */
interface UseSchedulerDataSyncArgs {
  readonly calendarYear: number;
  readonly calendarMonth: number;
  readonly showErrorToast: (key: string) => void;
}

/** The server read models of the scheduler page. */
interface SchedulerAppointments {
  /** Appointments scheduled for today. */
  readonly todayAppointments: AppointmentDto[];
  /** Appointments of the viewed calendar month. */
  readonly monthAppointments: AppointmentDto[];
  /** Appointments of the calendar grid: the viewed month plus its leading and trailing overflow days. */
  readonly calendarAppointments: AppointmentDto[];
  /** True until the whole month window has data or has failed. */
  readonly isLoadingMonth: boolean;
}

/** i18n keys of the two failure messages of one read. */
interface ReadFailureToastKeys {
  readonly authExpired: string;
  readonly failed: string;
}

const TODAY_FAILURE_KEYS: ReadFailureToastKeys = {
  authExpired: 'scheduler.todayAuthExpiredError',
  failed: 'scheduler.todayLoadError',
};

const MONTH_FAILURE_KEYS: ReadFailureToastKeys = {
  authExpired: 'scheduler.monthAuthExpiredError',
  failed: 'scheduler.monthLoadError',
};

/** The message to toast for a read status: none while it is not failing, the session one for an expired session. */
function toFailureMessageKey({ failure }: ReadStatus, { authExpired, failed }: ReadFailureToastKeys): string | null {
  if (failure === 'none') {
    return null;
  }

  return failure === 'auth-expired' ? authExpired : failed;
}

/** The month read with the visible-tab background refresh; TanStack never runs the interval in a hidden tab. */
function monthReadOptions(scope: AuthQueryScope | null, view: CalendarMonthView) {
  return {
    ...schedulerQueries.month(scope, view.year, view.month),
    refetchInterval: SCHEDULER_BACKGROUND_REFRESH_INTERVAL_MS,
  };
}

/** Reads the scheduler lists of the viewed month, keeps them fresh, and toasts a failed read once per episode. */
export function useSchedulerDataSync({
  calendarYear,
  calendarMonth,
  showErrorToast,
}: UseSchedulerDataSyncArgs): SchedulerAppointments {
  const scope = useAuthQueryScope();
  const [previousView, currentView, nextView] = getAdjacentMonthViews(calendarYear, calendarMonth);

  const todayQuery = useQuery({
    ...schedulerQueries.today(scope),
    refetchInterval: SCHEDULER_BACKGROUND_REFRESH_INTERVAL_MS,
  });
  const previousMonthQuery = useQuery(monthReadOptions(scope, previousView));
  const currentMonthQuery = useQuery(monthReadOptions(scope, currentView));
  const nextMonthQuery = useQuery(monthReadOptions(scope, nextView));

  const previousMonth = previousMonthQuery.data ?? EMPTY_APPOINTMENTS;
  const currentMonth = currentMonthQuery.data ?? EMPTY_APPOINTMENTS;
  const nextMonth = nextMonthQuery.data ?? EMPTY_APPOINTMENTS;
  const calendarAppointments = useMemo(
    () => mergeUniqueAppointments(previousMonth, currentMonth, nextMonth),
    [previousMonth, currentMonth, nextMonth],
  );

  const monthReads = [previousMonthQuery, currentMonthQuery, nextMonthQuery];
  const todayStatus = foldReadStatus([todayQuery]);
  const monthStatus = foldReadStatus(monthReads);

  useSchedulerLiveRefresh(scope);
  useReadFailureToast({
    failureMessageKey: toFailureMessageKey(todayStatus, TODAY_FAILURE_KEYS),
    errorUpdatedAt: todayStatus.errorAt,
    isSuccess: todayStatus.isSuccess,
    showErrorToast,
  });
  useReadFailureToast({
    failureMessageKey: toFailureMessageKey(monthStatus, MONTH_FAILURE_KEYS),
    errorUpdatedAt: monthStatus.errorAt,
    isSuccess: monthStatus.isSuccess,
    readKey: `${String(calendarYear)}-${String(calendarMonth)}`,
    showErrorToast,
  });

  return {
    todayAppointments: todayQuery.data ?? EMPTY_APPOINTMENTS,
    monthAppointments: currentMonth,
    calendarAppointments,
    isLoadingMonth: monthReads.some(isInitialLoading),
  };
}
