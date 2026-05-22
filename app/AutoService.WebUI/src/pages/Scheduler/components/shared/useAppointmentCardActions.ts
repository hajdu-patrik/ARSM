/**
 * Claim/unclaim action state for scheduler appointment cards.
 * @module pages/Scheduler/components/shared/useAppointmentCardActions
 */

import { useCallback, useState } from 'react';

interface UseAppointmentCardActionsParams {
  readonly appointmentId: number;
  readonly canClaimAppointment: boolean;
  readonly canUnclaimAppointment: boolean;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
}

/** Owns appointment-card claim/unclaim pending state and confirmation visibility. */
export function useAppointmentCardActions({
  appointmentId,
  canClaimAppointment,
  canUnclaimAppointment,
  onClaim,
  onUnclaim,
}: UseAppointmentCardActionsParams) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnclaiming, setIsUnclaiming] = useState(false);
  const [isClaimConfirmOpen, setIsClaimConfirmOpen] = useState(false);
  const [isUnclaimConfirmOpen, setIsUnclaimConfirmOpen] = useState(false);

  const handleClaim = useCallback(async () => {
    setIsClaiming(true);
    try {
      await onClaim(appointmentId);
      setIsClaimConfirmOpen(false);
    } catch (error) {
      console.error('Failed to claim appointment card action', error);
    } finally {
      setIsClaiming(false);
    }
  }, [appointmentId, onClaim]);

  const handleOpenClaimConfirm = useCallback(() => {
    if (canClaimAppointment && !isClaiming) {
      setIsClaimConfirmOpen(true);
    }
  }, [canClaimAppointment, isClaiming]);

  const handleUnclaim = useCallback(async () => {
    setIsUnclaiming(true);
    try {
      await onUnclaim(appointmentId);
      setIsUnclaimConfirmOpen(false);
    } catch (error) {
      console.error('Failed to unclaim appointment card action', error);
    } finally {
      setIsUnclaiming(false);
    }
  }, [appointmentId, onUnclaim]);

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
