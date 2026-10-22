/** Delete-confirmation state for the appointment detail modal; the delete is a mutation, so its pending flag is derived. */
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

interface UseAppointmentDeleteArgs {
  readonly appointmentId: number;
  /** Deletes the appointment by id; never rejects (errors are reported via toast by the caller). */
  readonly onDelete: (id: number) => Promise<void>;
}

interface UseAppointmentDeleteResult {
  readonly isDeleteConfirmOpen: boolean;
  readonly isDeleting: boolean;
  readonly openDeleteConfirm: () => void;
  /** Closes the delete confirmation modal, ignored while a delete is in flight. */
  readonly closeDeleteConfirm: () => void;
  readonly confirmDelete: () => void;
}

/** Delete-confirmation state for the detail dialog; its own hook because delete is the dialog's only admin-gated destructive action. */
export function useAppointmentDelete({ appointmentId, onDelete }: UseAppointmentDeleteArgs): UseAppointmentDeleteResult {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const { isPending: isDeleting, mutate: runDelete } = useMutation({
    mutationFn: () => onDelete(appointmentId),
    onSuccess: () => {
      setIsDeleteConfirmOpen(false);
    },
  });

  const openDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    if (!isDeleting) {
      setIsDeleteConfirmOpen(false);
    }
  }, [isDeleting]);

  const confirmDelete = useCallback(() => {
    runDelete();
  }, [runDelete]);

  return {
    isDeleteConfirmOpen,
    isDeleting,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
  };
}
