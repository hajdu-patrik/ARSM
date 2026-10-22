/** Part or labor type create/update/delete hook: modal state, payload validation, server calls, list refresh. */
import { useCallback, useState, type SyntheticEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isVersionConflict } from '../../../services/http/error-code';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { TOAST_KEY_NO_CHANGES } from '../../../store/toast.keys';
import { useToastStore } from '../../../store/toast.store';
import type { CatalogItemConfig } from '../catalogItem.config';
import {
  currentCatalogFieldErrors,
  EMPTY_CATALOG_FORM,
  pinCatalogFieldError,
  readCatalogFieldValues,
  type CatalogFormState,
  type CatalogModalMode,
  type DeleteCatalogItemTarget,
  type PinnedCatalogFieldError,
} from '../helpers';
import { buildCatalogValues, resolveCatalogSaveErrorKey, type CatalogItemValues } from './catalogMutation.helpers';

/** Variables of the update mutation: the edited item's id and the version it was loaded at. */
interface UpdateVariables {
  readonly id: number;
  readonly version: number;
  readonly values: CatalogItemValues;
}

/** True when the identifier, name and net rate all hold non-blank text. */
function hasRequiredFields(form: CatalogFormState): boolean {
  return form.identifier.trim().length > 0 && form.name.trim().length > 0 && form.rate.trim().length > 0;
}

/** True when the values differ from the edited item; the identifier compares case-insensitively. */
function hasUpdateChanges<TDto>(config: CatalogItemConfig<TDto>, snapshot: TDto, values: CatalogItemValues): boolean {
  const { tab } = config;
  return tab.getIdentifier(snapshot).trim().toUpperCase() !== values.identifier.trim().toUpperCase()
    || tab.getName(snapshot) !== values.name
    || tab.getNet(snapshot) !== values.rate
    || tab.getVat(snapshot) !== values.vatRatePercent;
}

/** Manages one catalog kind's form/delete modal state and create/update/delete mutations. */
export function useCatalogItemMutations<TDto>(config: CatalogItemConfig<TDto>) {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const showWarningToast = useToastStore((state) => state.showWarning);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<CatalogModalMode>('create');
  const [editingItem, setEditingItem] = useState<TDto | null>(null);
  const [form, setForm] = useState<CatalogFormState>(EMPTY_CATALOG_FORM);
  const [pinnedFieldError, setPinnedFieldError] = useState<PinnedCatalogFieldError | null>(null);
  const [deleteItem, setDeleteItem] = useState<TDto | null>(null);

  /** Marks every cached read of this kind stale (pages and options) and resolves once the mounted page has refetched. */
  const refreshList = useCallback(async () => {
    if (scope === null) {
      return;
    }

    await queryClient.invalidateQueries({ queryKey: config.queryKey(scope) });
  }, [config, queryClient, scope]);

  /** After a stale-version conflict: reloads the list and takes the item's current server state as the edit baseline,
   * so the next save carries its version. */
  const reloadAfterConflict = useCallback(async (id: number) => {
    try {
      const [latest] = await Promise.all([config.fetchItem(id), refreshList()]);
      setEditingItem(latest);
    } catch {
      // A failed reload leaves the dialog as it was: saving again conflicts again and retries it.
    }
  }, [config, refreshList]);

  /** Toasts a rejected save and, when the message concerns one field, pins it under that field. */
  const reportSaveError = useCallback((messageKey: string) => {
    setPinnedFieldError(pinCatalogFieldError(messageKey, readCatalogFieldValues(form)));
    showErrorToast(messageKey);
  }, [form, showErrorToast]);

  const { mutate: createItem, isPending: isCreating } = useMutation({
    mutationFn: (values: CatalogItemValues) => config.create(values),
    onSuccess: async () => {
      await refreshList();
      showSuccessToast(config.createdKey);
      setModalOpen(false);
    },
    onError: (error) => {
      reportSaveError(resolveCatalogSaveErrorKey(error, config.saveFailedKey));
    },
  });

  const { mutate: updateItem, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, version, values }: UpdateVariables) => config.update(id, version, values),
    // PUT returns 204 No Content: reload so the row shows the gross amount
    // the API recomputed.
    onSuccess: async () => {
      await refreshList();
      showSuccessToast(config.updatedKey);
      setModalOpen(false);
    },
    onError: (error, { id }) => {
      if (isVersionConflict(error, config.versionConflictCode)) {
        showErrorToast('inventory.errors.versionConflict');
        void reloadAfterConflict(id);
        return;
      }

      reportSaveError(resolveCatalogSaveErrorKey(error, config.saveFailedKey));
    },
  });

  const { mutate: deleteById, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => config.remove(id),
    onSuccess: async () => {
      await refreshList();
      showSuccessToast(config.deletedKey);
      setDeleteItem(null);
    },
    onError: () => {
      showErrorToast(config.deleteFailedKey);
    },
  });

  const isSaving = isCreating || isUpdating;
  const built = hasRequiredFields(form) ? buildCatalogValues(form) : null;
  const isSaveAllowed = built !== null && built.fieldError === null
    && (modalMode === 'create' || (editingItem !== null && hasUpdateChanges(config, editingItem, built.payload)));
  const fieldErrors = currentCatalogFieldErrors(pinnedFieldError, readCatalogFieldValues(form));
  const deleteTarget: DeleteCatalogItemTarget | null = deleteItem === null ? null : {
    kind: config.kind,
    id: config.tab.getId(deleteItem),
    name: config.tab.getName(deleteItem),
    identifier: config.tab.getIdentifier(deleteItem),
  };

  const openCreateModal = useCallback(() => {
    setModalMode('create');
    setEditingItem(null);
    setForm(EMPTY_CATALOG_FORM);
    setPinnedFieldError(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((item: TDto) => {
    setModalMode('edit');
    setEditingItem(item);
    setForm({
      identifier: config.tab.getIdentifier(item),
      name: config.tab.getName(item),
      rate: String(config.tab.getNet(item)),
      vatRatePercent: config.tab.getVat(item),
    });
    setPinnedFieldError(null);
    setModalOpen(true);
  }, [config]);

  const closeModal = useCallback(() => {
    if (!isSaving) {
      setModalOpen(false);
    }
  }, [isSaving]);

  const handleSubmit = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    const request = buildCatalogValues(form);

    if (request.fieldError !== null) {
      reportSaveError(request.fieldError);
      return;
    }

    if (modalMode === 'create') {
      createItem(request.payload);
      return;
    }

    if (editingItem === null) {
      return;
    }

    if (!hasUpdateChanges(config, editingItem, request.payload)) {
      showWarningToast(TOAST_KEY_NO_CHANGES);
      return;
    }

    updateItem({ id: config.tab.getId(editingItem), version: config.tab.getVersion(editingItem), values: request.payload });
  }, [config, createItem, editingItem, form, modalMode, reportSaveError, showWarningToast, updateItem]);

  const closeDeleteModal = useCallback(() => {
    if (!isDeleting) {
      setDeleteItem(null);
    }
  }, [isDeleting]);

  const handleDelete = useCallback(() => {
    if (deleteItem !== null) {
      deleteById(config.tab.getId(deleteItem));
    }
  }, [config, deleteById, deleteItem]);

  return {
    formConfig: config.form,
    modalOpen,
    modalMode,
    form,
    setForm,
    fieldErrors,
    isSaving,
    isSaveEnabled: isSaveAllowed && !isSaving,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    deleteTarget,
    isDeleting,
    openDeleteModal: setDeleteItem,
    closeDeleteModal,
    handleDelete,
  };
}
