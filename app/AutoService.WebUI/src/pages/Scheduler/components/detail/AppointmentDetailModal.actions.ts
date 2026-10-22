/** Confirm-then-run flows of the appointment detail dialog: claim, unclaim, status change and admin assignment. */
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';

interface UseAppointmentDetailActionsArgs {
  readonly appointmentId: number;
  readonly appointmentVersion: number;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onStatusChange: (id: number, status: AppointmentStatus, version: number) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
  readonly onAdminAssign: (appointmentId: number, mechanicId: number) => Promise<void>;
  readonly onAdminUnassign: (appointmentId: number, mechanicId: number) => Promise<void>;
}

/** State and handlers of the confirm dialogs and the mechanic assignment; each run is a mutation, so its pending flag is derived. */
export function useAppointmentDetailActions({
  appointmentId,
  appointmentVersion,
  onClaim,
  onStatusChange,
  onUnclaim,
  onAdminAssign,
  onAdminUnassign,
}: UseAppointmentDetailActionsArgs) {
  const [isClaimConfirmOpen, setIsClaimConfirmOpen] = useState(false);
  const [isUnclaimConfirmOpen, setIsUnclaimConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<AppointmentStatus | null>(null);
  const [selectedNewMechanicId, setSelectedNewMechanicId] = useState('');

  const { isPending: isClaiming, mutate: runClaim } = useMutation({
    mutationFn: () => onClaim(appointmentId),
    onSuccess: () => {
      setIsClaimConfirmOpen(false);
    },
  });
  const { isPending: isUnclaiming, mutate: runUnclaim } = useMutation({
    mutationFn: () => onUnclaim(appointmentId),
    onSuccess: () => {
      setIsUnclaimConfirmOpen(false);
    },
  });
  const { isPending: isUpdatingStatus, mutate: runStatusChange } = useMutation({
    mutationFn: (status: AppointmentStatus) => onStatusChange(appointmentId, status, appointmentVersion),
    onSuccess: () => {
      setPendingStatusChange(null);
    },
  });
  const { isPending: isAssigningMechanic, mutate: runAdminAssign } = useMutation({
    mutationFn: (mechanicId: number) => onAdminAssign(appointmentId, mechanicId),
    onSuccess: () => {
      setSelectedNewMechanicId('');
    },
  });
  const { isPending: isUnassigningMechanic, mutate: runAdminUnassign } = useMutation({
    mutationFn: (mechanicId: number) => onAdminUnassign(appointmentId, mechanicId),
  });

  const openClaimConfirm = useCallback(() => {
    setIsClaimConfirmOpen(true);
  }, []);

  const closeClaimConfirm = useCallback(() => {
    if (!isClaiming) {
      setIsClaimConfirmOpen(false);
    }
  }, [isClaiming]);

  const confirmClaim = useCallback(() => {
    runClaim();
  }, [runClaim]);

  const openUnclaimConfirm = useCallback(() => {
    setIsUnclaimConfirmOpen(true);
  }, []);

  const closeUnclaimConfirm = useCallback(() => {
    if (!isUnclaiming) {
      setIsUnclaimConfirmOpen(false);
    }
  }, [isUnclaiming]);

  const confirmUnclaim = useCallback(() => {
    runUnclaim();
  }, [runUnclaim]);

  const requestStatusChange = useCallback((status: AppointmentStatus) => {
    setPendingStatusChange(status);
  }, []);

  const closeStatusConfirm = useCallback(() => {
    if (!isUpdatingStatus) {
      setPendingStatusChange(null);
    }
  }, [isUpdatingStatus]);

  const confirmStatusChange = useCallback(() => {
    if (pendingStatusChange !== null) {
      runStatusChange(pendingStatusChange);
    }
  }, [pendingStatusChange, runStatusChange]);

  const assignSelectedMechanic = useCallback(() => {
    if (selectedNewMechanicId) {
      runAdminAssign(Number(selectedNewMechanicId));
    }
  }, [runAdminAssign, selectedNewMechanicId]);

  return {
    isClaiming,
    isUnclaiming,
    isUpdatingStatus,
    isAssigning: isAssigningMechanic || isUnassigningMechanic,
    isClaimConfirmOpen,
    isUnclaimConfirmOpen,
    pendingStatusChange,
    selectedNewMechanicId,
    openClaimConfirm,
    closeClaimConfirm,
    confirmClaim,
    openUnclaimConfirm,
    closeUnclaimConfirm,
    confirmUnclaim,
    requestStatusChange,
    closeStatusConfirm,
    confirmStatusChange,
    selectNewMechanic: setSelectedNewMechanicId,
    assignSelectedMechanic,
    unassignMechanic: runAdminUnassign,
  };
}
