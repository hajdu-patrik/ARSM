/**
 * Inventory (parts and labor types) master-data management page.
 *
 * Two tabs, Parts and Labor types, share the create/edit and delete modals.
 * The Parts tab loads by default and the active tab is reflected in the URL
 * (`?tab=parts` / `?tab=labor-types`).
 * @module pages/Inventory/page
 */
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useToastStore } from '../../store/toast.store';
import type { LaborTypeDto, PartDto } from '../../types/catalog/catalog.types';
import { useCatalogState } from './hooks/useCatalogState';
import { useCatalogMutations } from './hooks/useCatalogMutations';
import { CatalogTab } from './components/CatalogTab';
import { CatalogFormModal } from './components/CatalogFormModal';
import { DeleteCatalogItemModal } from './components/DeleteCatalogItemModal';
import { laborTypeCatalogTabConfig, partCatalogTabConfig } from './catalogTab.config';
import { laborTypeCatalogFormConfig, partCatalogFormConfig } from './catalogForm.config';
import type { DeleteCatalogItemTarget } from './helpers';
import {
  getSegmentedControlOptionClass,
  pageHeaderWithSubtitleClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
  segmentedControlClass,
} from '../../utils/formStyles';

type InventoryTab = 'parts' | 'labor-types';

function resolveActiveTab(searchParams: URLSearchParams): InventoryTab {
  return searchParams.get('tab') === 'labor-types' ? 'labor-types' : 'parts';
}

function resolveDeleteTarget(
  partTarget: PartDto | null,
  laborTypeTarget: LaborTypeDto | null,
): DeleteCatalogItemTarget | null {
  if (partTarget) {
    return { kind: 'part', id: partTarget.id, name: partTarget.name, identifier: partTarget.partNumber };
  }

  if (laborTypeTarget) {
    return { kind: 'laborType', id: laborTypeTarget.id, name: laborTypeTarget.name, identifier: laborTypeTarget.code };
  }

  return null;
}

const InventoryPageComponent = memo(function InventoryPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const showWarningToast = useToastStore((state) => state.showWarning);

  const activeTab = resolveActiveTab(searchParams);

  const setActiveTab = useCallback((tab: InventoryTab) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const catalogState = useCatalogState({ language: i18n.language, showErrorToast });

  const catalogMutations = useCatalogMutations({
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    setParts: catalogState.parts.setItems,
    reloadParts: catalogState.parts.load,
    setLaborTypes: catalogState.laborTypes.setItems,
    reloadLaborTypes: catalogState.laborTypes.load,
  });

  const deleteTarget = useMemo(
    () => resolveDeleteTarget(catalogMutations.deletePartTarget, catalogMutations.deleteLaborTypeTarget),
    [catalogMutations.deletePartTarget, catalogMutations.deleteLaborTypeTarget],
  );
  const isDeleting = catalogMutations.isDeletingPart || catalogMutations.isDeletingLaborType;

  const handleCloseDeleteModal = useCallback(() => {
    if (catalogMutations.deletePartTarget) {
      catalogMutations.closeDeletePartModal();
      return;
    }

    catalogMutations.closeDeleteLaborTypeModal();
  }, [catalogMutations]);

  const handleConfirmDelete = useCallback(() => {
    if (catalogMutations.deletePartTarget) {
      void catalogMutations.handleDeletePart();
      return;
    }

    if (catalogMutations.deleteLaborTypeTarget) {
      void catalogMutations.handleDeleteLaborType();
    }
  }, [catalogMutations]);

  return (
    <div className={`${pageShellClass} flex flex-col gap-6`}>
      <header className={pageHeaderWithSubtitleClass}>
        <h1 className={pageTitleClass}>{t('inventory.pageTitle')}</h1>
        <p className={pageSubtitleClass}>{t('inventory.pageDescription')}</p>
      </header>

      <div className={`${segmentedControlClass} max-w-md`}>
        <button
          type="button"
          aria-pressed={activeTab === 'parts'}
          onClick={() => setActiveTab('parts')}
          className={getSegmentedControlOptionClass(activeTab === 'parts')}
        >
          {t('inventory.tabs.parts')}
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'labor-types'}
          onClick={() => setActiveTab('labor-types')}
          className={getSegmentedControlOptionClass(activeTab === 'labor-types')}
        >
          {t('inventory.tabs.laborTypes')}
        </button>
      </div>

      {activeTab === 'parts' ? (
        <CatalogTab
          t={t}
          locale={i18n.language}
          items={catalogState.parts.filteredItems}
          isLoading={catalogState.parts.isLoading}
          searchTerm={catalogState.parts.searchTerm}
          onSearchChange={catalogState.parts.setSearchTerm}
          onClearSearch={catalogState.parts.clearSearch}
          sortDirection={catalogState.parts.sortDirection}
          onToggleSortDirection={catalogState.parts.toggleSortDirection}
          onOpenCreateModal={catalogMutations.openCreatePartModal}
          onOpenEditModal={catalogMutations.openEditPartModal}
          onOpenDeleteModal={catalogMutations.openDeletePartModal}
          config={partCatalogTabConfig}
        />
      ) : (
        <CatalogTab
          t={t}
          locale={i18n.language}
          items={catalogState.laborTypes.filteredItems}
          isLoading={catalogState.laborTypes.isLoading}
          searchTerm={catalogState.laborTypes.searchTerm}
          onSearchChange={catalogState.laborTypes.setSearchTerm}
          onClearSearch={catalogState.laborTypes.clearSearch}
          sortDirection={catalogState.laborTypes.sortDirection}
          onToggleSortDirection={catalogState.laborTypes.toggleSortDirection}
          onOpenCreateModal={catalogMutations.openCreateLaborTypeModal}
          onOpenEditModal={catalogMutations.openEditLaborTypeModal}
          onOpenDeleteModal={catalogMutations.openDeleteLaborTypeModal}
          config={laborTypeCatalogTabConfig}
        />
      )}

      <CatalogFormModal
        isOpen={catalogMutations.partModalOpen}
        mode={catalogMutations.partModalMode}
        isSaving={catalogMutations.isSavingPart}
        isSaveEnabled={catalogMutations.isPartSaveEnabled}
        form={catalogMutations.partForm}
        locale={i18n.language}
        t={t}
        onClose={catalogMutations.closePartModal}
        onSubmit={catalogMutations.handleSubmitPart}
        setForm={catalogMutations.setPartForm}
        config={partCatalogFormConfig}
      />

      <CatalogFormModal
        isOpen={catalogMutations.laborTypeModalOpen}
        mode={catalogMutations.laborTypeModalMode}
        isSaving={catalogMutations.isSavingLaborType}
        isSaveEnabled={catalogMutations.isLaborTypeSaveEnabled}
        form={catalogMutations.laborTypeForm}
        locale={i18n.language}
        t={t}
        onClose={catalogMutations.closeLaborTypeModal}
        onSubmit={catalogMutations.handleSubmitLaborType}
        setForm={catalogMutations.setLaborTypeForm}
        config={laborTypeCatalogFormConfig}
      />

      <DeleteCatalogItemModal
        target={deleteTarget}
        isDeleting={isDeleting}
        t={t}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
});

InventoryPageComponent.displayName = 'InventoryPage';

/** Inventory route component. */
export const InventoryPage = InventoryPageComponent;
