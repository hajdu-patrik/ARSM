/**
 * Labor type create/update/delete mutation hook.
 * Coordinates modal state, payload validation, server calls, and local list updates.
 * @module pages/Inventory/hooks/useLaborTypeMutations
 */
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { isAxiosError } from 'axios';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import type { CreateLaborTypeRequest, LaborTypeDto, UpdateLaborTypeRequest } from '../../../types/catalog/catalog.types';
import { laborTypeService } from '../../../services/catalog/labor-type.service';
import { TOAST_KEY_NO_CHANGES } from '../../../store/toast.keys';
import { buildLaborTypeRequest } from './catalogMutation.helpers';
import {
  EMPTY_LABOR_TYPE_FORM,
  hasServerFieldErrors,
  mapCatalogValidationMessageToKey,
  type CatalogModalMode,
  type LaborTypeFormState,
} from '../helpers';
import type { CatalogMutationToastHandlers } from './mutation-toast.types';

function hasRequiredLaborTypeFields(form: LaborTypeFormState): boolean {
  return form.code.trim().length > 0 && form.name.trim().length > 0 && form.hourlyNetRate.trim().length > 0;
}

function hasLaborTypeUpdateChanges(snapshot: LaborTypeDto, payload: CreateLaborTypeRequest | UpdateLaborTypeRequest): boolean {
  return snapshot.code.trim().toUpperCase() !== payload.code.trim().toUpperCase()
    || snapshot.name !== payload.name
    || snapshot.hourlyNetRate !== payload.hourlyNetRate
    || snapshot.vatRatePercent !== payload.vatRatePercent;
}

/** Dependencies required by labor type create/edit/delete mutation handlers. */
interface UseLaborTypeMutationsParams extends CatalogMutationToastHandlers {
  setLaborTypes: Dispatch<SetStateAction<LaborTypeDto[]>>;
  reloadLaborTypes: (force?: boolean) => Promise<void>;
}

/**
 * Manages the labor type form/delete modal state and create/update/delete mutations.
 * @param params Shared list setter, list reloader, and localized toast handlers.
 * @returns Labor type form and delete modal state plus mutation actions.
 */
export function useLaborTypeMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  setLaborTypes,
  reloadLaborTypes,
}: UseLaborTypeMutationsParams) {
  const [laborTypeModalOpen, setLaborTypeModalOpen] = useState(false);
  const [laborTypeModalMode, setLaborTypeModalMode] = useState<CatalogModalMode>('create');
  const [editingLaborTypeId, setEditingLaborTypeId] = useState<number | null>(null);
  const [editingLaborTypeSnapshot, setEditingLaborTypeSnapshot] = useState<LaborTypeDto | null>(null);
  const [laborTypeForm, setLaborTypeForm] = useState<LaborTypeFormState>(EMPTY_LABOR_TYPE_FORM);
  const [isSavingLaborType, setIsSavingLaborType] = useState(false);
  const [deleteLaborTypeTarget, setDeleteLaborTypeTarget] = useState<LaborTypeDto | null>(null);
  const [isDeletingLaborType, setIsDeletingLaborType] = useState(false);

  const hasRequiredValues = hasRequiredLaborTypeFields(laborTypeForm);
  const payloadResult = hasRequiredValues
    ? buildLaborTypeRequest(laborTypeForm)
    : { payload: null as never, fieldError: 'inventory.errors.fieldRequired' };
  const hasValidPayload = hasRequiredValues && payloadResult.fieldError === null;
  const isLaborTypeSaveEnabled = hasValidPayload
    && (laborTypeModalMode === 'create' || Boolean(editingLaborTypeSnapshot && hasLaborTypeUpdateChanges(editingLaborTypeSnapshot, payloadResult.payload)))
    && !isSavingLaborType;

  const openCreateLaborTypeModal = useCallback(() => {
    setLaborTypeModalMode('create');
    setEditingLaborTypeId(null);
    setEditingLaborTypeSnapshot(null);
    setLaborTypeForm(EMPTY_LABOR_TYPE_FORM);
    setLaborTypeModalOpen(true);
  }, []);

  const openEditLaborTypeModal = useCallback((laborType: LaborTypeDto) => {
    setLaborTypeModalMode('edit');
    setEditingLaborTypeId(laborType.id);
    setEditingLaborTypeSnapshot(laborType);
    setLaborTypeForm({
      code: laborType.code,
      name: laborType.name,
      hourlyNetRate: String(laborType.hourlyNetRate),
      vatRatePercent: laborType.vatRatePercent,
    });
    setLaborTypeModalOpen(true);
  }, []);

  const closeLaborTypeModal = useCallback(() => {
    if (isSavingLaborType) {
      return;
    }

    setLaborTypeModalOpen(false);
  }, [isSavingLaborType]);

  const handleSubmitLaborTypeError = useCallback((error: unknown) => {
    if (!isAxiosError<{ detail?: string; errors?: ServerFieldErrors }>(error)) {
      showErrorToast('inventory.errors.laborTypeSaveFailed');
      return;
    }

    const responseData = error.response?.data;
    const mappedFieldErrors = normalizeServerFieldErrors(
      extractServerFieldErrors(responseData),
      mapCatalogValidationMessageToKey,
    );

    if (hasServerFieldErrors(mappedFieldErrors)) {
      showErrorToast(getFirstFieldErrorMessage(mappedFieldErrors) ?? 'inventory.errors.laborTypeSaveFailed');
      return;
    }

    const detailKey = responseData?.detail
      ? mapCatalogValidationMessageToKey(responseData.detail)
      : 'inventory.errors.laborTypeSaveFailed';
    showErrorToast(detailKey);
  }, [showErrorToast]);

  const persistLaborTypeMutation = useCallback(async (payload: CreateLaborTypeRequest) => {
    if (laborTypeModalMode === 'create') {
      const created = await laborTypeService.createLaborType(payload);
      setLaborTypes((prev) => [...prev, created]);
      showSuccessToast('inventory.toasts.laborTypeCreated');
      return;
    }

    if (editingLaborTypeId === null) {
      return;
    }

    await laborTypeService.updateLaborType(editingLaborTypeId, payload);
    await reloadLaborTypes(true);
    showSuccessToast('inventory.toasts.laborTypeUpdated');
  }, [editingLaborTypeId, laborTypeModalMode, reloadLaborTypes, setLaborTypes, showSuccessToast]);

  const handleSubmitLaborType = useCallback(async (event: React.SyntheticEvent) => {
    event.preventDefault();

    const { payload, fieldError } = buildLaborTypeRequest(laborTypeForm);

    if (fieldError) {
      showErrorToast(fieldError);
      return;
    }

    if (
      laborTypeModalMode === 'edit'
      && editingLaborTypeSnapshot
      && !hasLaborTypeUpdateChanges(editingLaborTypeSnapshot, payload)
    ) {
      showWarningToast(TOAST_KEY_NO_CHANGES);
      return;
    }

    setIsSavingLaborType(true);

    try {
      await persistLaborTypeMutation(payload);
      setLaborTypeModalOpen(false);
    } catch (error) {
      handleSubmitLaborTypeError(error);
    } finally {
      setIsSavingLaborType(false);
    }
  }, [
    editingLaborTypeSnapshot,
    handleSubmitLaborTypeError,
    laborTypeForm,
    laborTypeModalMode,
    persistLaborTypeMutation,
    showErrorToast,
    showWarningToast,
  ]);

  const openDeleteLaborTypeModal = useCallback((laborType: LaborTypeDto) => setDeleteLaborTypeTarget(laborType), []);

  const closeDeleteLaborTypeModal = useCallback(() => {
    if (isDeletingLaborType) {
      return;
    }

    setDeleteLaborTypeTarget(null);
  }, [isDeletingLaborType]);

  const handleDeleteLaborType = useCallback(async () => {
    if (!deleteLaborTypeTarget) {
      return;
    }

    const id = deleteLaborTypeTarget.id;
    setIsDeletingLaborType(true);

    try {
      await laborTypeService.deleteLaborType(id);
      setLaborTypes((prev) => prev.filter((laborType) => laborType.id !== id));
      showSuccessToast('inventory.toasts.laborTypeDeleted');
      setDeleteLaborTypeTarget(null);
    } catch {
      showErrorToast('inventory.errors.laborTypeDeleteFailed');
    } finally {
      setIsDeletingLaborType(false);
    }
  }, [deleteLaborTypeTarget, setLaborTypes, showErrorToast, showSuccessToast]);

  return {
    laborTypeModalOpen,
    laborTypeModalMode,
    laborTypeForm,
    setLaborTypeForm,
    isSavingLaborType,
    isLaborTypeSaveEnabled,
    openCreateLaborTypeModal,
    openEditLaborTypeModal,
    closeLaborTypeModal,
    handleSubmitLaborType,
    deleteLaborTypeTarget,
    isDeletingLaborType,
    openDeleteLaborTypeModal,
    closeDeleteLaborTypeModal,
    handleDeleteLaborType,
  };
}
