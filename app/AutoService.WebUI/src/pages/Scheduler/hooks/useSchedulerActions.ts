/** Memoized scheduler mutation handlers: call the service, update store/query caches, and toast the result. */
import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { appointmentService } from '../../../services/scheduler/appointment.service';
import {
  invalidateAppointmentReadCaches,
  writeAppointmentToSchedulerCache,
} from '../../../services/cache/appointmentQueryCache';
import { getAuthQueryScope } from '../../../services/cache/queryKeys';
import { useAuthStore } from '../../../store/auth.store';
import { useSchedulerStore } from '../../../store/scheduler.store';
import type {
  AppointmentDto,
  AppointmentStatus,
  SchedulerCreateIntakeRequest,
  UpdateAppointmentRequest,
  UpdateAppointmentVehicleRequest,
} from '../../../types/scheduler/scheduler.types';

/** Configuration for {@link useSchedulerActions}. */
interface UseSchedulerActionsArgs {
  /** Optimistic store upsert for the mutated appointment. */
  readonly upsertAppointment: (appointment: AppointmentDto) => void;
  /** Store removal that drops a deleted appointment from every scheduler view list. */
  readonly removeAppointment: (id: number) => void;
  /** State setter to keep the detail modal synchronized after mutations. */
  readonly setSelectedAppointment: Dispatch<SetStateAction<AppointmentDto | null>>;
  /** Displays a success toast by i18n key. */
  readonly showSuccessToast: (key: string) => void;
  /** Displays an error toast by i18n key. */
  readonly showErrorToast: (key: string) => void;
}

/** Returns memoized scheduler action handlers for appointment mutations. */
export function useSchedulerActions({
  upsertAppointment,
  removeAppointment,
  setSelectedAppointment,
  showSuccessToast,
  showErrorToast,
}: UseSchedulerActionsArgs) {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const authScope = useMemo(() => getAuthQueryScope(authUser), [authUser]);

  /** Applies a scheduler mutation result to the UI store and related query caches. */
  const applyAppointmentMutationResult = useCallback((
    appointment: AppointmentDto,
    options: { readonly invalidateCustomerRegistry?: boolean } = {},
  ) => {
    upsertAppointment(appointment);

    if (!authScope) {
      return;
    }

    writeAppointmentToSchedulerCache(queryClient, authScope, appointment);
    invalidateAppointmentReadCaches(queryClient, authScope, appointment, options);
  }, [authScope, queryClient, upsertAppointment]);

  const handleClaim = useCallback(async (id: number) => {
    try {
      const updated = await appointmentService.claim(id);
      applyAppointmentMutationResult(updated);
      setSelectedAppointment((prev) => (prev?.id === updated.id ? updated : prev));
      showSuccessToast('scheduler.claimSuccess');
    } catch {
      showErrorToast('scheduler.claimError');
    }
  }, [applyAppointmentMutationResult, showErrorToast, setSelectedAppointment, showSuccessToast]);

  const handleStatusChange = useCallback(async (id: number, status: AppointmentStatus) => {
    try {
      const updated = await appointmentService.updateStatus(id, { status });
      applyAppointmentMutationResult(updated);
      setSelectedAppointment((prev) => (prev?.id === updated.id ? updated : prev));
      showSuccessToast('scheduler.statusUpdateSuccess');
    } catch {
      showErrorToast('scheduler.statusUpdateError');
    }
  }, [applyAppointmentMutationResult, showErrorToast, setSelectedAppointment, showSuccessToast]);

  const handleUnclaim = useCallback(async (id: number) => {
    try {
      const updated = await appointmentService.unclaim(id);
      applyAppointmentMutationResult(updated);
      setSelectedAppointment((prev) => (prev?.id === updated.id ? updated : prev));
      showSuccessToast('scheduler.detail.unassignSuccess');
    } catch (err) {
      if (isAxiosError<{ code?: string }>(err)) {
        const code = err.response?.data?.code;
        const status = err.response?.status;

        if (code === 'appointment_cancelled') {
          showErrorToast('scheduler.detail.unassignCancelledError');
          return;
        }

        if (
          code === 'appointment_completed'
          || code === 'last_assigned_mechanic'
          || code === 'not_assigned'
          || status === 400
          || status === 409
          || status === 422
        ) {
          showErrorToast('scheduler.detail.unassignRaceError');
          return;
        }

        showErrorToast('scheduler.detail.unassignError');
        return;
      }

      showErrorToast('scheduler.detail.unassignError');
    }
  }, [applyAppointmentMutationResult, showErrorToast, setSelectedAppointment, showSuccessToast]);

  const handleAdminAssign = useCallback(async (appointmentId: number, mechanicId: number) => {
    try {
      const updated = await appointmentService.adminAssign(appointmentId, mechanicId);
      applyAppointmentMutationResult(updated);
      setSelectedAppointment(updated);
      showSuccessToast('scheduler.detail.assignSuccess');
    } catch {
      showErrorToast('scheduler.detail.assignError');
    }
  }, [applyAppointmentMutationResult, showErrorToast, setSelectedAppointment, showSuccessToast]);

  const handleAdminUnassign = useCallback(async (appointmentId: number, mechanicId: number) => {
    try {
      const updated = await appointmentService.adminUnassign(appointmentId, mechanicId);
      applyAppointmentMutationResult(updated);
      setSelectedAppointment(updated);
      showSuccessToast('scheduler.detail.adminUnassignSuccess');
    } catch {
      showErrorToast('scheduler.detail.adminUnassignError');
    }
  }, [applyAppointmentMutationResult, showErrorToast, setSelectedAppointment, showSuccessToast]);

  const handleCreateIntake = useCallback(async (request: SchedulerCreateIntakeRequest) => {
    const created = await appointmentService.createIntake(request);
    applyAppointmentMutationResult(created, { invalidateCustomerRegistry: true });
    showSuccessToast('scheduler.intake.createSuccess');
  }, [applyAppointmentMutationResult, showSuccessToast]);

  const handleUpdateAppointment = useCallback(async (
    id: number,
    request: UpdateAppointmentRequest,
    vehicleRequest?: UpdateAppointmentVehicleRequest,
  ) => {
    let updated = await appointmentService.updateAppointment(id, request);

    if (vehicleRequest) {
      updated = await appointmentService.updateAppointmentVehicle(id, vehicleRequest);
    }

    applyAppointmentMutationResult(updated, { invalidateCustomerRegistry: Boolean(vehicleRequest) });
    setSelectedAppointment(updated);
    showSuccessToast('scheduler.detail.updateSuccess');
  }, [applyAppointmentMutationResult, showSuccessToast, setSelectedAppointment]);

  /** Looks up an appointment's cached snapshot across view buckets; reads the store imperatively to avoid subscribing to every list change. */
  const findVisibleAppointment = useCallback((id: number): AppointmentDto | undefined => {
    const schedulerState = useSchedulerStore.getState();
    return (
      schedulerState.monthAppointments.find((item) => item.id === id)
      ?? schedulerState.todayAppointments.find((item) => item.id === id)
      ?? schedulerState.calendarAppointments.find((item) => item.id === id)
    );
  }, []);

  /** Hard-deletes an appointment and invalidates its read caches; the snapshot is captured before the request because cache invalidation needs dates no longer in the store afterward. */
  const handleDelete = useCallback(async (id: number) => {
    const target = findVisibleAppointment(id);

    try {
      await appointmentService.deleteAppointment(id);
      removeAppointment(id);

      if (authScope && target) {
        invalidateAppointmentReadCaches(queryClient, authScope, target);
      }

      setSelectedAppointment(null);
      showSuccessToast('scheduler.detail.deleteSuccess');
    } catch {
      showErrorToast('scheduler.detail.deleteError');
    }
  }, [
    authScope,
    findVisibleAppointment,
    queryClient,
    removeAppointment,
    setSelectedAppointment,
    showErrorToast,
    showSuccessToast,
  ]);

  return {
    handleClaim,
    handleStatusChange,
    handleUnclaim,
    handleAdminAssign,
    handleAdminUnassign,
    handleCreateIntake,
    handleUpdateAppointment,
    handleDelete,
  };
}
