/** Edit-and-save flow of the appointment detail dialog: the edit form, its validation and the confirmed save. */
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToastStore } from '../../../../store/toast.store';
import type {
  AppointmentDto,
  UpdateAppointmentRequest,
  UpdateAppointmentVehicleRequest,
} from '../../../../types/scheduler/scheduler.types';
import {
  type EditFormState,
  buildEditForm,
  buildUpdateRequestFromEditForm,
  buildUpdatedAppointmentSnapshot,
  canSaveEditForm,
  hasAppointmentEditChanges,
  normalizeEditFieldValue,
} from './AppointmentDetailModal.edit';

interface UseAppointmentEditingArgs {
  readonly appointment: AppointmentDto;
  readonly onUpdate: (
    id: number,
    request: UpdateAppointmentRequest,
    vehicleRequest?: UpdateAppointmentVehicleRequest,
  ) => Promise<void>;
}

/** State and handlers of the edit mode; the save is a mutation, so its pending flag is derived. */
export function useAppointmentEditing({ appointment, onUpdate }: UseAppointmentEditingArgs) {
  const showErrorToast = useToastStore((state) => state.showError);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(() => buildEditForm(appointment));
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  const { isPending: isSaving, mutate: runSave } = useMutation({
    mutationFn: (request: UpdateAppointmentRequest) => onUpdate(appointment.id, request),
    onSuccess: (_result, request) => {
      setIsSaveConfirmOpen(false);
      setIsEditing(false);
      setEditForm(buildEditForm(buildUpdatedAppointmentSnapshot(appointment, { appointment: request })));
    },
  });

  const isSaveEnabled = isEditing && canSaveEditForm(appointment, editForm);

  const startEditing = useCallback(() => {
    setEditForm(buildEditForm(appointment));
    setIsEditing(true);
  }, [appointment]);

  const exitEditing = useCallback(() => {
    setEditForm(buildEditForm(appointment));
    setIsEditing(false);
  }, [appointment]);

  const cancelEditing = useCallback(() => {
    exitEditing();
    setIsSaveConfirmOpen(false);
  }, [exitEditing]);

  const changeField = useCallback((field: keyof EditFormState, value: string) => {
    setEditForm((previous) => ({
      ...previous,
      [field]: normalizeEditFieldValue(field, value),
    }));
  }, []);

  const requestSave = useCallback(() => {
    if (!isSaving && isSaveEnabled) {
      setIsSaveConfirmOpen(true);
    }
  }, [isSaveEnabled, isSaving]);

  const closeSaveConfirm = useCallback(() => {
    if (isSaving) {
      return;
    }

    setIsSaveConfirmOpen(false);
    if (isEditing) {
      exitEditing();
    }
  }, [exitEditing, isEditing, isSaving]);

  const confirmSave = useCallback(() => {
    const validation = buildUpdateRequestFromEditForm(appointment, editForm);
    if ('errorKey' in validation) {
      showErrorToast(validation.errorKey);
      return;
    }

    if (!hasAppointmentEditChanges(appointment, validation.request.appointment)) {
      exitEditing();
      setIsSaveConfirmOpen(false);
      return;
    }

    runSave(validation.request.appointment);
  }, [appointment, editForm, exitEditing, runSave, showErrorToast]);

  return {
    isEditing,
    editForm,
    isSaving,
    isSaveEnabled,
    isSaveConfirmOpen,
    startEditing,
    cancelEditing,
    changeField,
    requestSave,
    closeSaveConfirm,
    confirmSave,
  };
}
