/** Scheduler mutation handlers: every action is a mutation that updates the scheduler caches and toasts the outcome. */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { appointmentService } from '../../../services/scheduler/appointment.service';
import {
  findCachedAppointment,
  invalidateAppointmentReadCaches,
  removeAppointmentFromSchedulerCache,
} from '../../../services/cache/appointmentQueryCache';
import { readErrorCode } from '../../../services/http/error-code';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { useToastStore } from '../../../store/toast.store';
import type {
  AppointmentDto,
  AppointmentStatus,
  SchedulerCreateIntakeRequest,
  UpdateAppointmentRequest,
  UpdateAppointmentVehicleRequest,
} from '../../../types/scheduler/scheduler.types';
import { settle } from './settle';
import { useAppointmentMutation } from './useAppointmentMutation';

interface MechanicAssignment {
  readonly appointmentId: number;
  readonly mechanicId: number;
}

/** Variables of the status mutation: the version the appointment was shown at travels with the new status. */
interface StatusChange {
  readonly id: number;
  readonly status: AppointmentStatus;
  readonly version: number;
}

/** Variables of the update mutation; the vehicle details are saved after the appointment fields. */
interface AppointmentUpdate {
  readonly id: number;
  readonly request: UpdateAppointmentRequest;
  readonly vehicleRequest: UpdateAppointmentVehicleRequest | undefined;
}

/** Server codes that mean the unassign lost a race with another change. */
const UNASSIGN_RACE_CODES: ReadonlySet<string> = new Set(['appointment_completed', 'last_assigned_mechanic', 'not_assigned']);

/** HTTP statuses the unassign endpoint answers when the appointment changed under the user. */
const UNASSIGN_RACE_STATUSES: ReadonlySet<number> = new Set([400, 409, 422]);

/** Maps a failed self-unassign to its toast key: cancelled, lost race, or a plain failure. */
function resolveUnclaimErrorKey(error: unknown): string {
  if (!isAxiosError<unknown>(error)) {
    return 'scheduler.detail.unassignError';
  }

  const code = readErrorCode(error);
  const status = error.response?.status;

  if (code === 'appointment_cancelled') {
    return 'scheduler.detail.unassignCancelledError';
  }

  if ((code !== undefined && UNASSIGN_RACE_CODES.has(code)) || (status !== undefined && UNASSIGN_RACE_STATUSES.has(status))) {
    return 'scheduler.detail.unassignRaceError';
  }

  return 'scheduler.detail.unassignError';
}

/** Saves the appointment fields, then the vehicle details when given; resolves with the last saved state. */
async function updateWithOptionalVehicle({ id, request, vehicleRequest }: AppointmentUpdate): Promise<AppointmentDto> {
  const updated = await appointmentService.updateAppointment(id, request);

  return vehicleRequest === undefined ? updated : appointmentService.updateAppointmentVehicle(id, vehicleRequest);
}

/** Claim, unclaim and admin assignment handlers; a failure is toasted and never rejects. */
function useAssignmentActions() {
  const { mutateAsync: claim } = useAppointmentMutation({
    mutationFn: (id: number) => appointmentService.claim(id),
    successKey: 'scheduler.claimSuccess',
    failureKey: 'scheduler.claimError',
  });
  const { mutateAsync: unclaim } = useAppointmentMutation({
    mutationFn: (id: number) => appointmentService.unclaim(id),
    successKey: 'scheduler.detail.unassignSuccess',
    failureKey: resolveUnclaimErrorKey,
  });
  const { mutateAsync: adminAssign } = useAppointmentMutation({
    mutationFn: ({ appointmentId, mechanicId }: MechanicAssignment) => appointmentService.adminAssign(appointmentId, mechanicId),
    successKey: 'scheduler.detail.assignSuccess',
    failureKey: 'scheduler.detail.assignError',
  });
  const { mutateAsync: adminUnassign } = useAppointmentMutation({
    mutationFn: ({ appointmentId, mechanicId }: MechanicAssignment) => appointmentService.adminUnassign(appointmentId, mechanicId),
    successKey: 'scheduler.detail.adminUnassignSuccess',
    failureKey: 'scheduler.detail.adminUnassignError',
  });

  const handleClaim = useCallback((id: number) => settle(claim(id)), [claim]);
  const handleUnclaim = useCallback((id: number) => settle(unclaim(id)), [unclaim]);
  const handleAdminAssign = useCallback(
    (appointmentId: number, mechanicId: number) => settle(adminAssign({ appointmentId, mechanicId })),
    [adminAssign],
  );
  const handleAdminUnassign = useCallback(
    (appointmentId: number, mechanicId: number) => settle(adminUnassign({ appointmentId, mechanicId })),
    [adminUnassign],
  );

  return { handleClaim, handleUnclaim, handleAdminAssign, handleAdminUnassign };
}

/** Status, intake and update handlers; the status and update failures are toasted, the intake one rejects to its form. */
function useEditActions() {
  const { mutateAsync: changeStatus } = useAppointmentMutation({
    mutationFn: ({ id, status, version }: StatusChange) => appointmentService.updateStatus(id, { status, version }),
    successKey: 'scheduler.statusUpdateSuccess',
    failureKey: 'scheduler.statusUpdateError',
  });
  const { mutateAsync: createIntake } = useAppointmentMutation({
    mutationFn: (request: SchedulerCreateIntakeRequest) => appointmentService.createIntake(request),
    successKey: 'scheduler.intake.createSuccess',
    failureKey: null,
    cacheOptions: () => ({ invalidateCustomerRegistry: true }),
  });
  const { mutateAsync: updateAppointment } = useAppointmentMutation({
    mutationFn: updateWithOptionalVehicle,
    successKey: 'scheduler.detail.updateSuccess',
    failureKey: 'scheduler.detail.updateError',
    cacheOptions: ({ vehicleRequest }) => ({ invalidateCustomerRegistry: vehicleRequest !== undefined }),
  });

  const handleStatusChange = useCallback(
    (id: number, status: AppointmentStatus, version: number) => settle(changeStatus({ id, status, version })),
    [changeStatus],
  );
  const handleCreateIntake = useCallback(async (request: SchedulerCreateIntakeRequest) => {
    await createIntake(request);
  }, [createIntake]);
  const handleUpdateAppointment = useCallback(async (
    id: number,
    request: UpdateAppointmentRequest,
    vehicleRequest?: UpdateAppointmentVehicleRequest,
  ) => {
    await updateAppointment({ id, request, vehicleRequest });
  }, [updateAppointment]);

  return { handleStatusChange, handleCreateIntake, handleUpdateAppointment };
}

/** Hard-delete handler: drops the appointment from the cached lists at once and refreshes the reads it touched. */
function useDeleteAction() {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const { mutateAsync: deleteAppointment } = useMutation({
    mutationFn: (id: number) => appointmentService.deleteAppointment(id),
    // The history invalidation needs the vehicle and customer ids, which the delete takes along.
    onMutate: (id) => ({ snapshot: scope === null ? undefined : findCachedAppointment(queryClient, scope, id) }),
    onSuccess: (_result, id, { snapshot }) => {
      if (scope !== null) {
        removeAppointmentFromSchedulerCache(queryClient, scope, id);

        if (snapshot !== undefined) {
          invalidateAppointmentReadCaches(queryClient, scope, snapshot);
        }
      }

      showSuccessToast('scheduler.detail.deleteSuccess');
    },
    onError: () => {
      showErrorToast('scheduler.detail.deleteError');
    },
  });

  return useCallback((id: number) => settle(deleteAppointment(id)), [deleteAppointment]);
}

export function useSchedulerActions() {
  const assignmentActions = useAssignmentActions();
  const editActions = useEditActions();
  const handleDelete = useDeleteAction();

  return { ...assignmentActions, ...editActions, handleDelete };
}
