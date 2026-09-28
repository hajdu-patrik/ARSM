/** Query-cache helpers for appointment read models and mutation results. */

import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';
import { queryKeys, type AuthQueryScope } from './queryKeys';

/** Options that control which related read caches are invalidated after an appointment mutation. */
interface AppointmentMutationCacheOptions {
  readonly invalidateCustomerRegistry?: boolean;
}

/** Sorts appointments by scheduled date while preserving immutable cache updates. */
function sortAppointments(appointments: AppointmentDto[]): AppointmentDto[] {
  return [...appointments].sort((left, right) => (
    new Date(left.scheduledDate).getTime() - new Date(right.scheduledDate).getTime()
  ));
}

/** Replaces or inserts one appointment inside a cached appointment collection, date-sorted. */
function upsertAppointment(appointments: AppointmentDto[], updated: AppointmentDto): AppointmentDto[] {
  const withoutUpdated = appointments.filter((appointment) => appointment.id !== updated.id);
  return sortAppointments([...withoutUpdated, updated]);
}

/** Resolves the local-time month bucket for a scheduled date; a UTC bucket could misplace it when the
 * local and UTC calendar day differ (must match {@link getAdjacentMonthViews} and the scheduler store). */
function getAppointmentLocalMonth(appointment: AppointmentDto): { year: number; month: number } {
  const scheduledDate = new Date(appointment.scheduledDate);
  return {
    year: scheduledDate.getFullYear(),
    month: scheduledDate.getMonth() + 1,
  };
}

/** Checks whether an appointment is scheduled today in local time (for the cached today query). */
function isScheduledToday(appointment: AppointmentDto): boolean {
  const scheduledDate = new Date(appointment.scheduledDate);
  const now = new Date();

  return scheduledDate.getFullYear() === now.getFullYear()
    && scheduledDate.getMonth() === now.getMonth()
    && scheduledDate.getDate() === now.getDate();
}

/** Checks whether a scheduler month query key targets a given year-month bucket. */
function queryKeyMonthMatches(queryKey: QueryKey, year: number, month: number): boolean {
  const keyYear = queryKey.at(-2);
  const keyMonth = queryKey.at(-1);

  return keyYear === year && keyMonth === month;
}

/** Writes a mutation result into currently materialized scheduler caches without changing fetch policy. */
export function writeAppointmentToSchedulerCache(
  queryClient: QueryClient,
  authScope: AuthQueryScope,
  appointment: AppointmentDto,
): void {
  const appointmentMonth = getAppointmentLocalMonth(appointment);

  queryClient.setQueryData<AppointmentDto[]>(queryKeys.scheduler.today(authScope), (current) => {
    if (!current) {
      return current;
    }

    const withoutUpdated = current.filter((item) => item.id !== appointment.id);
    return isScheduledToday(appointment)
      ? upsertAppointment(withoutUpdated, appointment)
      : withoutUpdated;
  });

  const monthQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.scheduler.monthRoot(authScope),
  });

  for (const query of monthQueries) {
    queryClient.setQueryData<AppointmentDto[]>(query.queryKey, (current) => {
      if (!current) {
        return current;
      }

      const withoutUpdated = current.filter((item) => item.id !== appointment.id);
      return queryKeyMonthMatches(query.queryKey, appointmentMonth.year, appointmentMonth.month)
        ? upsertAppointment(withoutUpdated, appointment)
        : withoutUpdated;
    });
  }
}

/** Invalidates scheduler and appointment-history reads affected by an appointment mutation. */
export function invalidateAppointmentReadCaches(
  queryClient: QueryClient,
  authScope: AuthQueryScope,
  appointment: AppointmentDto,
  options: AppointmentMutationCacheOptions = {},
): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.root(authScope) });
  void queryClient.invalidateQueries({
    exact: true,
    queryKey: queryKeys.customers.customerHistory(authScope, appointment.vehicle.customerId),
  });
  void queryClient.invalidateQueries({
    exact: true,
    queryKey: queryKeys.customers.vehicleHistory(authScope, appointment.vehicle.id),
  });

  if (options.invalidateCustomerRegistry) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.customers.root(authScope) });
  }
}
