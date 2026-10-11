/** Part create/update/delete mutation hook: modal state, payload validation, server calls, cached list updates. */
import { useCallback, useState, type SyntheticEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../services/cache/queryKeys';
import { partService } from '../../../services/catalog/part.service';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { TOAST_KEY_NO_CHANGES } from '../../../store/toast.keys';
import type { CreatePartRequest, PartDto, UpdatePartRequest } from '../../../types/catalog/catalog.types';
import { partCatalogFormConfig, readCatalogFieldValues } from '../catalogForm.config';
import {
  currentCatalogFieldErrors,
  EMPTY_PART_FORM,
  pinCatalogFieldError,
  type CatalogModalMode,
  type PartFormState,
  type PinnedCatalogFieldError,
} from '../helpers';
import { buildPartRequest, resolveCatalogSaveErrorKey, type CatalogRequestResult } from './catalogMutation.helpers';
import type { CatalogMutationToastHandlers } from './mutation-toast.types';

/** Variables of the part update mutation. */
interface UpdatePartVariables {
  readonly id: number;
  readonly request: UpdatePartRequest;
}

/** True when the part number, name and net price all hold non-blank text. */
function hasRequiredPartFields(form: PartFormState): boolean {
  return form.partNumber.trim().length > 0 && form.name.trim().length > 0 && form.netUnitPrice.trim().length > 0;
}

/** True when the payload differs from the edited part; the part number compares case-insensitively. */
function hasPartUpdateChanges(snapshot: PartDto, payload: CreatePartRequest | UpdatePartRequest): boolean {
  return snapshot.partNumber.trim().toUpperCase() !== payload.partNumber.trim().toUpperCase()
    || snapshot.name !== payload.name
    || snapshot.netUnitPrice !== payload.netUnitPrice
    || snapshot.vatRatePercent !== payload.vatRatePercent;
}

/** A part form can be saved with a valid payload and, when editing, at least one real change. */
function isPartSaveAllowed(
  mode: CatalogModalMode,
  snapshot: PartDto | null,
  built: CatalogRequestResult<CreatePartRequest> | null,
): boolean {
  if (built === null || built.fieldError !== null) {
    return false;
  }

  return mode === 'create' || (snapshot !== null && hasPartUpdateChanges(snapshot, built.payload));
}

/** Manages the part form/delete modal state and create/update/delete mutations. */
export function usePartMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
}: CatalogMutationToastHandlers) {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partModalMode, setPartModalMode] = useState<CatalogModalMode>('create');
  const [editingPart, setEditingPart] = useState<PartDto | null>(null);
  const [partForm, setPartForm] = useState<PartFormState>(EMPTY_PART_FORM);
  const [pinnedFieldError, setPinnedFieldError] = useState<PinnedCatalogFieldError | null>(null);
  const [deletePartTarget, setDeletePartTarget] = useState<PartDto | null>(null);

  /** Rewrites the cached part list; a list that has not loaded yet is left to its own fetch. */
  const updatePartList = useCallback((update: (parts: PartDto[]) => PartDto[]) => {
    if (scope === null) {
      return;
    }

    queryClient.setQueryData<PartDto[]>(queryKeys.catalog.parts(scope), (parts) => parts && update(parts));
  }, [queryClient, scope]);

  /** Marks the cached part list stale and resolves once the mounted list has refetched. */
  const refreshPartList = useCallback(async () => {
    if (scope === null) {
      return;
    }

    await queryClient.invalidateQueries({ exact: true, queryKey: queryKeys.catalog.parts(scope) });
  }, [queryClient, scope]);

  /** Toasts a rejected save and, when the message concerns one field, pins it under that field. */
  const reportSaveError = useCallback((messageKey: string) => {
    setPinnedFieldError(pinCatalogFieldError(messageKey, readCatalogFieldValues(partCatalogFormConfig, partForm)));
    showErrorToast(messageKey);
  }, [partForm, showErrorToast]);

  const { mutate: createPart, isPending: isCreatingPart } = useMutation({
    mutationFn: (request: CreatePartRequest) => partService.createPart(request),
    onSuccess: (created) => {
      updatePartList((parts) => [...parts, created]);
      showSuccessToast('inventory.toasts.partCreated');
      setPartModalOpen(false);
    },
    onError: (error) => {
      reportSaveError(resolveCatalogSaveErrorKey(error, 'inventory.errors.partSaveFailed'));
    },
  });

  const { mutate: updatePart, isPending: isUpdatingPart } = useMutation({
    mutationFn: ({ id, request }: UpdatePartVariables) => partService.updatePart(id, request),
    // PUT returns 204 No Content: reload so the row shows the gross unit price
    // the API recomputed.
    onSuccess: async () => {
      await refreshPartList();
      showSuccessToast('inventory.toasts.partUpdated');
      setPartModalOpen(false);
    },
    onError: (error) => {
      reportSaveError(resolveCatalogSaveErrorKey(error, 'inventory.errors.partSaveFailed'));
    },
  });

  const { mutate: deletePart, isPending: isDeletingPart } = useMutation({
    mutationFn: (id: number) => partService.deletePart(id),
    onSuccess: (_result, id) => {
      updatePartList((parts) => parts.filter((part) => part.id !== id));
      showSuccessToast('inventory.toasts.partDeleted');
      setDeletePartTarget(null);
    },
    onError: () => {
      showErrorToast('inventory.errors.partDeleteFailed');
    },
  });

  const isSavingPart = isCreatingPart || isUpdatingPart;
  const builtRequest = hasRequiredPartFields(partForm) ? buildPartRequest(partForm) : null;
  const isPartSaveEnabled = isPartSaveAllowed(partModalMode, editingPart, builtRequest) && !isSavingPart;
  const partFieldErrors = currentCatalogFieldErrors(
    pinnedFieldError,
    readCatalogFieldValues(partCatalogFormConfig, partForm),
  );

  const openCreatePartModal = useCallback(() => {
    setPartModalMode('create');
    setEditingPart(null);
    setPartForm(EMPTY_PART_FORM);
    setPinnedFieldError(null);
    setPartModalOpen(true);
  }, []);

  const openEditPartModal = useCallback((part: PartDto) => {
    setPartModalMode('edit');
    setEditingPart(part);
    setPartForm({
      partNumber: part.partNumber,
      name: part.name,
      netUnitPrice: String(part.netUnitPrice),
      vatRatePercent: part.vatRatePercent,
    });
    setPinnedFieldError(null);
    setPartModalOpen(true);
  }, []);

  const closePartModal = useCallback(() => {
    if (isSavingPart) {
      return;
    }

    setPartModalOpen(false);
  }, [isSavingPart]);

  const handleSubmitPart = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    const request = buildPartRequest(partForm);

    if (request.fieldError !== null) {
      reportSaveError(request.fieldError);
      return;
    }

    if (partModalMode === 'create') {
      createPart(request.payload);
      return;
    }

    if (editingPart === null) {
      return;
    }

    if (!hasPartUpdateChanges(editingPart, request.payload)) {
      showWarningToast(TOAST_KEY_NO_CHANGES);
      return;
    }

    updatePart({ id: editingPart.id, request: request.payload });
  }, [createPart, editingPart, partForm, partModalMode, reportSaveError, showWarningToast, updatePart]);

  const openDeletePartModal = useCallback((part: PartDto) => {
    setDeletePartTarget(part);
  }, []);

  const closeDeletePartModal = useCallback(() => {
    if (isDeletingPart) {
      return;
    }

    setDeletePartTarget(null);
  }, [isDeletingPart]);

  const handleDeletePart = useCallback(() => {
    if (deletePartTarget !== null) {
      deletePart(deletePartTarget.id);
    }
  }, [deletePart, deletePartTarget]);

  return {
    partModalOpen,
    partModalMode,
    partForm,
    setPartForm,
    partFieldErrors,
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
