/** Query-cache helpers for appointment read models and mutation results. */

import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';
import { queryKeys, type AuthQueryScope } from './queryKeys';

/** Options that control which related read caches are invalidated after an appointment mutation. */
export interface AppointmentMutationCacheOptions {
  readonly invalidateCustomerRegistry?: boolean;
}

/** Sorts appointments by scheduled date while preserving immutable cache updates. */
function sortAppointments(appointments: AppointmentDto[]): AppointmentDto[] {
  return [...appointments].sort((left, right) => (
    new Date(left.scheduledDate).getTime() - new Date(right.scheduledDate).getTime()
  ));
}

function upsertAppointment(appointments: AppointmentDto[], updated: AppointmentDto): AppointmentDto[] {
  const withoutUpdated = appointments.filter((appointment) => appointment.id !== updated.id);
  return sortAppointments([...withoutUpdated, updated]);
}

/** Resolves the local-time month bucket for a scheduled date; a UTC bucket could misplace it when the
 * local and UTC calendar day differ (must match the month window of useSchedulerDataSync). */
function getAppointmentLocalMonth(appointment: AppointmentDto): { year: number; month: number } {
  const scheduledDate = new Date(appointment.scheduledDate);
  return {
    year: scheduledDate.getFullYear(),
    month: scheduledDate.getMonth() + 1,
  };
}

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

/** Drops a hard-deleted appointment from every materialized scheduler list (all cached months). */
export function removeAppointmentFromSchedulerCache(
  queryClient: QueryClient,
  authScope: AuthQueryScope,
  appointmentId: number,
): void {
  queryClient.setQueriesData<AppointmentDto[]>(
    { queryKey: queryKeys.scheduler.root(authScope) },
    (current) => current?.filter((item) => item.id !== appointmentId),
  );
}

/** Finds a cached snapshot of an appointment across the cached months; read before a delete,
 * because the history invalidation needs the vehicle and customer ids that the delete removes. */
export function findCachedAppointment(
  queryClient: QueryClient,
  authScope: AuthQueryScope,
  appointmentId: number,
): AppointmentDto | undefined {
  const cachedLists = queryClient.getQueriesData<AppointmentDto[]>({
    queryKey: queryKeys.scheduler.root(authScope),
  });

  for (const [, appointments] of cachedLists) {
    const match = appointments?.find((item) => item.id === appointmentId);
    if (match) {
      return match;
    }
  }

  return undefined;
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
