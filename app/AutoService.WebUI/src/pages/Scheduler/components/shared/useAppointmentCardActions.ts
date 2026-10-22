/** Claim/unclaim action state for scheduler appointment cards. */

import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { logError } from '../../../../utils/devLog';
import { settle } from '../../hooks/settle';

interface UseAppointmentCardActionsParams {
  readonly appointmentId: number;
  readonly canClaimAppointment: boolean;
  readonly canUnclaimAppointment: boolean;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
}

/** Owns appointment-card claim/unclaim confirmation visibility; each action is a mutation, so its pending flag is derived. */
export function useAppointmentCardActions({
  appointmentId,
  canClaimAppointment,
  canUnclaimAppointment,
  onClaim,
  onUnclaim,
}: UseAppointmentCardActionsParams) {
  const [isClaimConfirmOpen, setIsClaimConfirmOpen] = useState(false);
  const [isUnclaimConfirmOpen, setIsUnclaimConfirmOpen] = useState(false);

  const { isPending: isClaiming, mutateAsync: claimAppointment } = useMutation({
    mutationFn: () => onClaim(appointmentId),
    onSuccess: () => {
      setIsClaimConfirmOpen(false);
    },
    onError: (error) => {
      logError('scheduler.card.claim', error);
    },
  });
  const { isPending: isUnclaiming, mutateAsync: unclaimAppointment } = useMutation({
    mutationFn: () => onUnclaim(appointmentId),
    onSuccess: () => {
      setIsUnclaimConfirmOpen(false);
    },
    onError: (error) => {
      logError('scheduler.card.unclaim', error);
    },
  });

  const handleClaim = useCallback(() => settle(claimAppointment()), [claimAppointment]);
  const handleUnclaim = useCallback(() => settle(unclaimAppointment()), [unclaimAppointment]);

  const handleOpenClaimConfirm = useCallback(() => {
    if (canClaimAppointment && !isClaiming) {
      setIsClaimConfirmOpen(true);
    }
  }, [canClaimAppointment, isClaiming]);

  const handleOpenUnclaimConfirm = useCallback(() => {
    if (canUnclaimAppointment && !isUnclaiming) {
      setIsUnclaimConfirmOpen(true);
    }
  }, [canUnclaimAppointment, isUnclaiming]);

  const closeClaimConfirm = useCallback(() => {
    if (!isClaiming) {
      setIsClaimConfirmOpen(false);
    }
  }, [isClaiming]);

  const closeUnclaimConfirm = useCallback(() => {
    if (!isUnclaiming) {
      setIsUnclaimConfirmOpen(false);
    }
  }, [isUnclaiming]);

  return {
    isClaiming,
    isUnclaiming,
    isClaimConfirmOpen,
    isUnclaimConfirmOpen,
    handleClaim,
    handleOpenClaimConfirm,
    handleUnclaim,
    handleOpenUnclaimConfirm,
    closeClaimConfirm,
    closeUnclaimConfirm,
  };
}
