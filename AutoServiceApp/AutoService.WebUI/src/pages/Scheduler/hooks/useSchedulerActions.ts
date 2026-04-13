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

interface UseSchedulerActionsArgs {
  readonly upsertAppointment: (appointment: AppointmentDto) => void;
  readonly setSelectedAppointment: Dispatch<SetStateAction<AppointmentDto | null>>;
  readonly showSuccessToast: (key: string) => void;
  readonly showErrorToast: (key: string) => void;
}

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
