/**
 * Hook that encapsulates all scheduler appointment mutation callbacks.
 *
 * Provides stable, memoized handlers for claim, unclaim, status change,
 * admin assign/unassign, intake creation, and appointment update. Each
 * handler calls the appointment service, applies optimistic store updates,
 * and shows success/error toasts.
 *
 * @module useSchedulerActions
 */
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { isAxiosError } from 'axios';
import { appointmentService } from '../../../services/scheduler/appointment.service';
import type {
  AppointmentDto,
  AppointmentStatus,
  SchedulerCreateIntakeRequest,
  UpdateAppointmentRequest,
} from '../../../types/scheduler/scheduler.types';

/** Configuration for {@link useSchedulerActions}. */
interface UseSchedulerActionsArgs {
  /** Optimistic store upsert for the mutated appointment. */
  readonly upsertAppointment: (appointment: AppointmentDto) => void;
  /** State setter to keep the detail modal synchronized after mutations. */
  readonly setSelectedAppointment: Dispatch<SetStateAction<AppointmentDto | null>>;
  /** Displays a success toast by i18n key. */
  readonly showSuccessToast: (key: string) => void;
  /** Displays an error toast by i18n key. */
  readonly showErrorToast: (key: string) => void;
}

/**
 * Returns memoized scheduler action handlers for appointment mutations.
 *
 * Each handler calls the backend, upserts the result into the store,
 * updates the selected-appointment state, and triggers a toast.
 */
export function useSchedulerActions({
  upsertAppointment,
  setSelectedAppointment,
  showSuccessToast,
  showErrorToast,
}: UseSchedulerActionsArgs) {
  const handleClaim = useCallback(async (id: number) => {
    try {
      const updated = await appointmentService.claim(id);
      upsertAppointment(updated);
      setSelectedAppointment((prev) => (prev?.id === updated.id ? updated : prev));
    } catch {
      showErrorToast('scheduler.claimError');
    }
  }, [showErrorToast, setSelectedAppointment, upsertAppointment]);

  const handleStatusChange = useCallback(async (id: number, status: AppointmentStatus) => {
    try {
      const updated = await appointmentService.updateStatus(id, { status });
      upsertAppointment(updated);
      setSelectedAppointment((prev) => (prev?.id === updated.id ? updated : prev));
    } catch {
      showErrorToast('scheduler.statusUpdateError');
    }
  }, [showErrorToast, setSelectedAppointment, upsertAppointment]);

  const handleUnclaim = useCallback(async (id: number) => {
    try {
      const updated = await appointmentService.unclaim(id);
      upsertAppointment(updated);
      setSelectedAppointment(updated);
    } catch (err) {
      if (isAxiosError<{ code?: string }>(err) && err.response?.data?.code === 'appointment_cancelled') {
        showErrorToast('scheduler.detail.unassignCancelledError');
        return;
      }

      showErrorToast('scheduler.detail.unassignError');
    }
  }, [showErrorToast, setSelectedAppointment, upsertAppointment]);

  const handleAdminAssign = useCallback(async (appointmentId: number, mechanicId: number) => {
    try {
      const updated = await appointmentService.adminAssign(appointmentId, mechanicId);
      upsertAppointment(updated);
      setSelectedAppointment(updated);
    } catch {
      showErrorToast('scheduler.detail.assignError');
    }
  }, [showErrorToast, setSelectedAppointment, upsertAppointment]);

  const handleAdminUnassign = useCallback(async (appointmentId: number, mechanicId: number) => {
    try {
      const updated = await appointmentService.adminUnassign(appointmentId, mechanicId);
      upsertAppointment(updated);
      setSelectedAppointment(updated);
    } catch {
      showErrorToast('scheduler.detail.adminUnassignError');
    }
  }, [showErrorToast, setSelectedAppointment, upsertAppointment]);

  const handleCreateIntake = useCallback(async (request: SchedulerCreateIntakeRequest) => {
    const created = await appointmentService.createIntake(request);
    upsertAppointment(created);
    showSuccessToast('scheduler.intake.createSuccess');
  }, [showSuccessToast, upsertAppointment]);

  const handleUpdateAppointment = useCallback(async (id: number, request: UpdateAppointmentRequest) => {
    const updated = await appointmentService.updateAppointment(id, request);
    upsertAppointment(updated);
    setSelectedAppointment(updated);
    showSuccessToast('scheduler.detail.updateSuccess');
  }, [showSuccessToast, setSelectedAppointment, upsertAppointment]);

  return {
    handleClaim,
    handleStatusChange,
    handleUnclaim,
    handleAdminAssign,
    handleAdminUnassign,
    handleCreateIntake,
    handleUpdateAppointment,
  };
}
