/** Labor type create/update/delete mutation hook: modal state, payload validation, server calls, list refresh. */
import { useCallback, useState, type SyntheticEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../services/cache/queryKeys';
import { laborTypeService } from '../../../services/catalog/labor-type.service';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { TOAST_KEY_NO_CHANGES } from '../../../store/toast.keys';
import type {
  CreateLaborTypeRequest,
  LaborTypeDto,
  UpdateLaborTypeRequest,
} from '../../../types/catalog/catalog.types';
import { laborTypeCatalogFormConfig, readCatalogFieldValues } from '../catalogForm.config';
import {
  currentCatalogFieldErrors,
  EMPTY_LABOR_TYPE_FORM,
  pinCatalogFieldError,
  type CatalogModalMode,
  type LaborTypeFormState,
  type PinnedCatalogFieldError,
} from '../helpers';
import { buildLaborTypeRequest, resolveCatalogSaveErrorKey, type CatalogRequestResult } from './catalogMutation.helpers';
import type { CatalogMutationToastHandlers } from './mutation-toast.types';

/** Variables of the labor type update mutation. */
interface UpdateLaborTypeVariables {
  readonly id: number;
  readonly request: UpdateLaborTypeRequest;
}

/** True when the code, name and hourly net rate all hold non-blank text. */
function hasRequiredLaborTypeFields(form: LaborTypeFormState): boolean {
  return form.code.trim().length > 0 && form.name.trim().length > 0 && form.hourlyNetRate.trim().length > 0;
}

/** True when the payload differs from the edited labor type; the code compares case-insensitively. */
function hasLaborTypeUpdateChanges(snapshot: LaborTypeDto, payload: CreateLaborTypeRequest | UpdateLaborTypeRequest): boolean {
  return snapshot.code.trim().toUpperCase() !== payload.code.trim().toUpperCase()
    || snapshot.name !== payload.name
    || snapshot.hourlyNetRate !== payload.hourlyNetRate
    || snapshot.vatRatePercent !== payload.vatRatePercent;
}

/** A labor type form can be saved with a valid payload and, when editing, at least one real change. */
function isLaborTypeSaveAllowed(
  mode: CatalogModalMode,
  snapshot: LaborTypeDto | null,
  built: CatalogRequestResult<CreateLaborTypeRequest> | null,
): boolean {
  if (built === null || built.fieldError !== null) {
    return false;
  }

  return mode === 'create' || (snapshot !== null && hasLaborTypeUpdateChanges(snapshot, built.payload));
}

/** Manages the labor type form/delete modal state and create/update/delete mutations. */
export function useLaborTypeMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
}: CatalogMutationToastHandlers) {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();
  const [laborTypeModalOpen, setLaborTypeModalOpen] = useState(false);
  const [laborTypeModalMode, setLaborTypeModalMode] = useState<CatalogModalMode>('create');
  const [editingLaborType, setEditingLaborType] = useState<LaborTypeDto | null>(null);
  const [laborTypeForm, setLaborTypeForm] = useState<LaborTypeFormState>(EMPTY_LABOR_TYPE_FORM);
  const [pinnedFieldError, setPinnedFieldError] = useState<PinnedCatalogFieldError | null>(null);
  const [deleteLaborTypeTarget, setDeleteLaborTypeTarget] = useState<LaborTypeDto | null>(null);

  /** Marks every cached labor-type read stale (pages and options) and resolves once the mounted page has refetched. */
  const refreshLaborTypeList = useCallback(async () => {
    if (scope === null) {
      return;
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.catalog.laborTypes(scope) });
  }, [queryClient, scope]);

  /** Toasts a rejected save and, when the message concerns one field, pins it under that field. */
  const reportSaveError = useCallback((messageKey: string) => {
    setPinnedFieldError(
      pinCatalogFieldError(messageKey, readCatalogFieldValues(laborTypeCatalogFormConfig, laborTypeForm)),
    );
    showErrorToast(messageKey);
  }, [laborTypeForm, showErrorToast]);

  const { mutate: createLaborType, isPending: isCreatingLaborType } = useMutation({
    mutationFn: (request: CreateLaborTypeRequest) => laborTypeService.createLaborType(request),
    onSuccess: async () => {
      await refreshLaborTypeList();
      showSuccessToast('inventory.toasts.laborTypeCreated');
      setLaborTypeModalOpen(false);
    },
    onError: (error) => {
      reportSaveError(resolveCatalogSaveErrorKey(error, 'inventory.errors.laborTypeSaveFailed'));
    },
  });

  const { mutate: updateLaborType, isPending: isUpdatingLaborType } = useMutation({
    mutationFn: ({ id, request }: UpdateLaborTypeVariables) => laborTypeService.updateLaborType(id, request),
    onSuccess: async () => {
      await refreshLaborTypeList();
      showSuccessToast('inventory.toasts.laborTypeUpdated');
      setLaborTypeModalOpen(false);
    },
    onError: (error) => {
      reportSaveError(resolveCatalogSaveErrorKey(error, 'inventory.errors.laborTypeSaveFailed'));
    },
  });

  const { mutate: deleteLaborType, isPending: isDeletingLaborType } = useMutation({
    mutationFn: (id: number) => laborTypeService.deleteLaborType(id),
    onSuccess: async () => {
      await refreshLaborTypeList();
      showSuccessToast('inventory.toasts.laborTypeDeleted');
      setDeleteLaborTypeTarget(null);
    },
    onError: () => {
      showErrorToast('inventory.errors.laborTypeDeleteFailed');
    },
  });

  const isSavingLaborType = isCreatingLaborType || isUpdatingLaborType;
  const builtRequest = hasRequiredLaborTypeFields(laborTypeForm) ? buildLaborTypeRequest(laborTypeForm) : null;
  const isLaborTypeSaveEnabled = isLaborTypeSaveAllowed(laborTypeModalMode, editingLaborType, builtRequest)
    && !isSavingLaborType;
  const laborTypeFieldErrors = currentCatalogFieldErrors(
    pinnedFieldError,
    readCatalogFieldValues(laborTypeCatalogFormConfig, laborTypeForm),
  );

  const openCreateLaborTypeModal = useCallback(() => {
    setLaborTypeModalMode('create');
    setEditingLaborType(null);
    setLaborTypeForm(EMPTY_LABOR_TYPE_FORM);
    setPinnedFieldError(null);
    setLaborTypeModalOpen(true);
  }, []);

  const openEditLaborTypeModal = useCallback((laborType: LaborTypeDto) => {
    setLaborTypeModalMode('edit');
    setEditingLaborType(laborType);
    setLaborTypeForm({
      code: laborType.code,
      name: laborType.name,
      hourlyNetRate: String(laborType.hourlyNetRate),
      vatRatePercent: laborType.vatRatePercent,
    });
    setPinnedFieldError(null);
    setLaborTypeModalOpen(true);
  }, []);

  const closeLaborTypeModal = useCallback(() => {
    if (isSavingLaborType) {
      return;
    }

    setLaborTypeModalOpen(false);
  }, [isSavingLaborType]);

  const handleSubmitLaborType = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    const request = buildLaborTypeRequest(laborTypeForm);

    if (request.fieldError !== null) {
      reportSaveError(request.fieldError);
      return;
    }

    if (laborTypeModalMode === 'create') {
      createLaborType(request.payload);
      return;
    }

    if (editingLaborType === null) {
      return;
    }

    if (!hasLaborTypeUpdateChanges(editingLaborType, request.payload)) {
      showWarningToast(TOAST_KEY_NO_CHANGES);
      return;
    }

    updateLaborType({ id: editingLaborType.id, request: request.payload });
  }, [
    createLaborType,
    editingLaborType,
    laborTypeForm,
    laborTypeModalMode,
    reportSaveError,
    showWarningToast,
    updateLaborType,
  ]);

  const openDeleteLaborTypeModal = useCallback((laborType: LaborTypeDto) => {
    setDeleteLaborTypeTarget(laborType);
  }, []);

  const closeDeleteLaborTypeModal = useCallback(() => {
    if (isDeletingLaborType) {
      return;
    }

    setDeleteLaborTypeTarget(null);
  }, [isDeletingLaborType]);

  const handleDeleteLaborType = useCallback(() => {
    if (deleteLaborTypeTarget !== null) {
      deleteLaborType(deleteLaborTypeTarget.id);
    }
  }, [deleteLaborType, deleteLaborTypeTarget]);

  return {
    laborTypeModalOpen,
    laborTypeModalMode,
    laborTypeForm,
    setLaborTypeForm,
    laborTypeFieldErrors,
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
