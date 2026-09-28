/** Delete-confirmation state for the appointment detail modal; mirrors the unassign confirm flow (busy flag always released on settle). */
import { useCallback, useState } from 'react';

/** Inputs of {@link useAppointmentDelete}. */
interface UseAppointmentDeleteArgs {
  /** Id of the currently open appointment, or `undefined` when none is open. */
  readonly appointmentId: number | undefined;
  /** Deletes the appointment by id; never rejects (errors are reported via toast by the caller). */
  readonly onDelete: (id: number) => Promise<void>;
}

/** Delete-confirmation state and handlers consumed by the detail footer and confirm modals. */
interface UseAppointmentDeleteResult {
  /** Whether the delete confirmation modal is open. */
  readonly isDeleteConfirmOpen: boolean;
  /** Whether the delete request is in flight. */
  readonly isDeleting: boolean;
  /** Opens the delete confirmation modal. */
  readonly openDeleteConfirm: () => void;
  /** Closes the delete confirmation modal, ignored while a delete is in flight. */
  readonly closeDeleteConfirm: () => void;
  /** Runs the delete for the current appointment and closes the confirmation modal. */
  readonly confirmDelete: () => Promise<void>;
  /** Resets the confirmation state, for when the detail modal closes or switches appointment. */
  readonly resetDeleteConfirm: () => void;
}

/** Delete-confirmation state for {@link AppointmentDetailModal}; its own hook because delete is the modal's only admin-gated destructive action. */
export function useAppointmentDelete({ appointmentId, onDelete }: UseAppointmentDeleteArgs): UseAppointmentDeleteResult {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    if (!isDeleting) {
      setIsDeleteConfirmOpen(false);
    }
  }, [isDeleting]);

  const resetDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (appointmentId === undefined) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(appointmentId);
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }, [appointmentId, onDelete]);

  return {
    isDeleteConfirmOpen,
    isDeleting,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    resetDeleteConfirm,
  };
}
