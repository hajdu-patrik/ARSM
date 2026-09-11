/**
 * Part create/update/delete mutation hook.
 * Coordinates modal state, payload validation, server calls, and local list updates.
 * @module pages/Inventory/hooks/usePartMutations
 */
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { isAxiosError } from 'axios';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import type { CreatePartRequest, PartDto, UpdatePartRequest } from '../../../types/catalog/catalog.types';
import { partService } from '../../../services/catalog/part.service';
import { TOAST_KEY_NO_CHANGES } from '../../../store/toast.keys';
import { buildPartRequest } from './catalogMutation.helpers';
import {
  EMPTY_PART_FORM,
  hasServerFieldErrors,
  mapCatalogValidationMessageToKey,
  type CatalogModalMode,
  type PartFormState,
} from '../helpers';
import type { CatalogMutationToastHandlers } from './mutation-toast.types';

function hasRequiredPartFields(form: PartFormState): boolean {
  return form.partNumber.trim().length > 0 && form.name.trim().length > 0 && form.netUnitPrice.trim().length > 0;
}

function hasPartUpdateChanges(snapshot: PartDto, payload: CreatePartRequest | UpdatePartRequest): boolean {
  return snapshot.partNumber.trim().toUpperCase() !== payload.partNumber.trim().toUpperCase()
    || snapshot.name !== payload.name
    || snapshot.netUnitPrice !== payload.netUnitPrice
    || snapshot.vatRatePercent !== payload.vatRatePercent;
}

/** Dependencies required by part create/edit/delete mutation handlers. */
interface UsePartMutationsParams extends CatalogMutationToastHandlers {
  setParts: Dispatch<SetStateAction<PartDto[]>>;
  reloadParts: (force?: boolean) => Promise<void>;
}

/**
 * Manages the part form/delete modal state and create/update/delete mutations.
 * @param params Shared list setter, list reloader, and localized toast handlers.
 * @returns Part form and delete modal state plus mutation actions.
 */
export function usePartMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  setParts,
  reloadParts,
}: UsePartMutationsParams) {
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partModalMode, setPartModalMode] = useState<CatalogModalMode>('create');
  const [editingPartId, setEditingPartId] = useState<number | null>(null);
  const [editingPartSnapshot, setEditingPartSnapshot] = useState<PartDto | null>(null);
  const [partForm, setPartForm] = useState<PartFormState>(EMPTY_PART_FORM);
  const [isSavingPart, setIsSavingPart] = useState(false);
  const [deletePartTarget, setDeletePartTarget] = useState<PartDto | null>(null);
  const [isDeletingPart, setIsDeletingPart] = useState(false);

  const hasRequiredValues = hasRequiredPartFields(partForm);
  const payloadResult = hasRequiredValues
    ? buildPartRequest(partForm)
    : { payload: null as never, fieldError: 'inventory.errors.fieldRequired' };
  const hasValidPayload = hasRequiredValues && payloadResult.fieldError === null;
  const isPartSaveEnabled = hasValidPayload
    && (partModalMode === 'create' || Boolean(editingPartSnapshot && hasPartUpdateChanges(editingPartSnapshot, payloadResult.payload)))
    && !isSavingPart;

  const openCreatePartModal = useCallback(() => {
    setPartModalMode('create');
    setEditingPartId(null);
    setEditingPartSnapshot(null);
    setPartForm(EMPTY_PART_FORM);
    setPartModalOpen(true);
  }, []);

  const openEditPartModal = useCallback((part: PartDto) => {
    setPartModalMode('edit');
    setEditingPartId(part.id);
    setEditingPartSnapshot(part);
    setPartForm({
      partNumber: part.partNumber,
      name: part.name,
      netUnitPrice: String(part.netUnitPrice),
      vatRatePercent: part.vatRatePercent,
    });
    setPartModalOpen(true);
  }, []);

  const closePartModal = useCallback(() => {
    if (isSavingPart) {
      return;
    }

    setPartModalOpen(false);
  }, [isSavingPart]);

  const handleSubmitPartError = useCallback((error: unknown) => {
    if (!isAxiosError<{ detail?: string; errors?: ServerFieldErrors }>(error)) {
      showErrorToast('inventory.errors.partSaveFailed');
      return;
    }

    const responseData = error.response?.data;
    const mappedFieldErrors = normalizeServerFieldErrors(
      extractServerFieldErrors(responseData),
      mapCatalogValidationMessageToKey,
    );

    if (hasServerFieldErrors(mappedFieldErrors)) {
      showErrorToast(getFirstFieldErrorMessage(mappedFieldErrors) ?? 'inventory.errors.partSaveFailed');
      return;
    }

    const detailKey = responseData?.detail
      ? mapCatalogValidationMessageToKey(responseData.detail)
      : 'inventory.errors.partSaveFailed';
    showErrorToast(detailKey);
  }, [showErrorToast]);

  const persistPartMutation = useCallback(async (payload: CreatePartRequest) => {
    if (partModalMode === 'create') {
      const created = await partService.createPart(payload);
      setParts((prev) => [...prev, created]);
      showSuccessToast('inventory.toasts.partCreated');
      return;
    }

    if (editingPartId === null) {
      return;
    }

    await partService.updatePart(editingPartId, payload);
    // PUT returns 204 No Content: reload so the row reflects the server's
    // authoritative recomputed gross unit price.
    await reloadParts(true);
    showSuccessToast('inventory.toasts.partUpdated');
  }, [editingPartId, partModalMode, reloadParts, setParts, showSuccessToast]);

  const handleSubmitPart = useCallback(async (event: React.SyntheticEvent) => {
    event.preventDefault();

    const { payload, fieldError } = buildPartRequest(partForm);

    if (fieldError) {
      showErrorToast(fieldError);
      return;
    }

    if (partModalMode === 'edit' && editingPartSnapshot && !hasPartUpdateChanges(editingPartSnapshot, payload)) {
      showWarningToast(TOAST_KEY_NO_CHANGES);
      return;
    }

    setIsSavingPart(true);

    try {
      await persistPartMutation(payload);
      setPartModalOpen(false);
    } catch (error) {
      handleSubmitPartError(error);
    } finally {
      setIsSavingPart(false);
    }
  }, [editingPartSnapshot, handleSubmitPartError, partForm, partModalMode, persistPartMutation, showErrorToast, showWarningToast]);

  const openDeletePartModal = useCallback((part: PartDto) => setDeletePartTarget(part), []);

  const closeDeletePartModal = useCallback(() => {
    if (isDeletingPart) {
      return;
    }

    setDeletePartTarget(null);
  }, [isDeletingPart]);

  const handleDeletePart = useCallback(async () => {
    if (!deletePartTarget) {
      return;
    }

    const id = deletePartTarget.id;
    setIsDeletingPart(true);

    try {
      await partService.deletePart(id);
      setParts((prev) => prev.filter((part) => part.id !== id));
      showSuccessToast('inventory.toasts.partDeleted');
      setDeletePartTarget(null);
    } catch {
      showErrorToast('inventory.errors.partDeleteFailed');
    } finally {
      setIsDeletingPart(false);
    }
  }, [deletePartTarget, setParts, showErrorToast, showSuccessToast]);

  return {
    partModalOpen,
    partModalMode,
    partForm,
    setPartForm,
    isSavingPart,
    isPartSaveEnabled,
    openCreatePartModal,
    openEditPartModal,
    closePartModal,
    handleSubmitPart,
    deletePartTarget,
    isDeletingPart,
    openDeletePartModal,
    closeDeletePartModal,
    handleDeletePart,
  };
}
