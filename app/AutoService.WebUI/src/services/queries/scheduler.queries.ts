/** Query options of the scheduler reads: today appointments and one calendar month. */

import { SCHEDULER_MONTH_STALE_TIME_MS, SCHEDULER_TODAY_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { appointmentService } from '../scheduler/appointment.service';
import { scopedQueryOptions } from './scopedQueryOptions';

/** Scheduler read factories; every one takes the scope of useAuthQueryScope() first. */
export const schedulerQueries = {
  /** The appointments of today. */
  today: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.scheduler.today,
      (request) => appointmentService.getToday(request),
      SCHEDULER_TODAY_STALE_TIME_MS,
    ),

  /** The appointments of one calendar month (month 1-12). */
  month: (scope: AuthQueryScope | null, year: number, month: number) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.scheduler.month(authScope, year, month),
      (request) => appointmentService.getByMonth(year, month, request),
      SCHEDULER_MONTH_STALE_TIME_MS,
    ),
};
