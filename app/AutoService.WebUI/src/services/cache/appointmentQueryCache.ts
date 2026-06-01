/** Query-cache helpers for appointment read models and mutation results. */

import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';
import { queryKeys, type AuthQueryScope } from './queryKeys';

/** Options that control which related read caches are invalidated after an appointment mutation. */
interface AppointmentMutationCacheOptions {
  readonly invalidateCustomerRegistry?: boolean;
}

/**
 * Sorts appointments by scheduled date while preserving immutable cache updates.
 * @param appointments Appointments to sort.
 * @returns A new appointment array ordered by scheduled date.
 */
function sortAppointments(appointments: AppointmentDto[]): AppointmentDto[] {
  return [...appointments].sort((left, right) => (
    new Date(left.scheduledDate).getTime() - new Date(right.scheduledDate).getTime()
  ));
}

/**
 * Replaces or inserts one appointment inside a cached appointment collection.
 * @param appointments Current cached appointment collection.
 * @param updated Appointment returned by the latest mutation.
 * @returns A date-sorted collection containing the latest appointment data.
 */
function upsertAppointment(appointments: AppointmentDto[], updated: AppointmentDto): AppointmentDto[] {
  const withoutUpdated = appointments.filter((appointment) => appointment.id !== updated.id);
  return sortAppointments([...withoutUpdated, updated]);
}

/**
 * Resolves the UTC month bucket used by cached scheduler month queries.
 * @param appointment Appointment whose scheduled date determines the bucket.
 * @returns Calendar year and 1-based month for the scheduled date.
 */
function getAppointmentUtcMonth(appointment: AppointmentDto): { year: number; month: number } {
  const scheduledDate = new Date(appointment.scheduledDate);
  return {
    year: scheduledDate.getUTCFullYear(),
    month: scheduledDate.getUTCMonth() + 1,
  };
}

/**
 * Checks whether an appointment belongs in the cached today query.
 * @param appointment Appointment to compare with the current UTC date.
 * @returns {@code true} when the appointment is scheduled today in UTC.
 */
function isScheduledTodayUtc(appointment: AppointmentDto): boolean {
  const scheduledDate = new Date(appointment.scheduledDate);
  const now = new Date();

  return scheduledDate.getUTCFullYear() === now.getUTCFullYear()
    && scheduledDate.getUTCMonth() === now.getUTCMonth()
    && scheduledDate.getUTCDate() === now.getUTCDate();
}

/**
 * Checks whether a scheduler month query key targets a given year-month bucket.
 * @param queryKey TanStack Query key for a cached scheduler month query.
 * @param year Calendar year expected in the key.
 * @param month 1-based calendar month expected in the key.
 * @returns {@code true} when the key points to the requested month bucket.
 */
function queryKeyMonthMatches(queryKey: QueryKey, year: number, month: number): boolean {
  const keyYear = queryKey.at(-2);
  const keyMonth = queryKey.at(-1);

  return keyYear === year && keyMonth === month;
}

/**
 * Writes a mutation result into currently materialized scheduler caches without changing fetch policy.
 * @param queryClient Shared query client that owns the browser cache.
 * @param authScope Authenticated query scope for the current user.
 * @param appointment Appointment returned by a scheduler mutation.
 */
export function writeAppointmentToSchedulerCache(
  queryClient: QueryClient,
  authScope: AuthQueryScope,
  appointment: AppointmentDto,
): void {
  const appointmentMonth = getAppointmentUtcMonth(appointment);

  queryClient.setQueryData<AppointmentDto[]>(queryKeys.scheduler.today(authScope), (current) => {
    if (!current) {
      return current;
    }

    const withoutUpdated = current.filter((item) => item.id !== appointment.id);
    return isScheduledTodayUtc(appointment)
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

/**
 * Invalidates scheduler and appointment-history reads affected by an appointment mutation.
 * @param queryClient Shared query client that owns the browser cache.
 * @param authScope Authenticated query scope for the current user.
 * @param appointment Appointment returned by a scheduler mutation.
 * @param options Optional related-cache invalidation switches.
 */
export function invalidateAppointmentReadCaches(
  queryClient: QueryClient,
  authScope: AuthQueryScope,
  appointment: AppointmentDto,
  options: AppointmentMutationCacheOptions = {},
): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.root(authScope) });
  void queryClient.invalidateQueries({
    exact: true,
    queryKey: queryKeys.customers.customerHistory(authScope, appointment.vehicle.customer.id),
  });
  void queryClient.invalidateQueries({
    exact: true,
    queryKey: queryKeys.customers.vehicleHistory(authScope, appointment.vehicle.id),
  });

  if (options.invalidateCustomerRegistry) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.customers.root(authScope) });
  }
}
