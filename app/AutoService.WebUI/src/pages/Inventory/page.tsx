/** Inventory page: Parts and Labor types tabs sharing create/edit/delete modals; active tab reflected in the URL. */
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../../store/toast.store';
import type { LaborTypeDto, PartDto } from '../../types/catalog/catalog.types';
import { useCatalogMutations } from './hooks/useCatalogMutations';
import { INVENTORY_TAB_LABEL_KEYS, INVENTORY_TABS, useInventoryTabs } from './hooks/useInventoryTabs';
import { LaborTypesCatalogTab, PartsCatalogTab } from './components/CatalogTabs';
import { CatalogFormModal } from './components/CatalogFormModal';
import { DeleteCatalogItemModal } from './components/DeleteCatalogItemModal';
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

/** Maps whichever part or labor type awaits delete confirmation to the shared delete-modal target. */
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
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const showWarningToast = useToastStore((state) => state.showWarning);

  const tabs = useInventoryTabs();
  const catalogMutations = useCatalogMutations({ showSuccessToast, showErrorToast, showWarningToast });

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
      catalogMutations.handleDeletePart();
      return;
    }

    if (catalogMutations.deleteLaborTypeTarget) {
      catalogMutations.handleDeleteLaborType();
    }
  }, [catalogMutations]);

  return (
    <div className={`${pageShellClass} flex flex-col gap-6`}>
      <header className={pageHeaderWithSubtitleClass}>
        <h1 id={tabs.headingId} className={pageTitleClass}>{t('nav.inventory')}</h1>
        <p className={pageSubtitleClass}>{t('inventory.pageDescription')}</p>
      </header>

      <div role="tablist" aria-labelledby={tabs.headingId} className={`${segmentedControlClass} max-w-md`}>
        {INVENTORY_TABS.map((tab) => {
          const isActive = tab === tabs.activeTab;

          return (
            <button
              key={tab}
              id={tabs.getTabId(tab)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={tabs.panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                tabs.selectTab(tab);
              }}
              onKeyDown={(event) => {
                tabs.handleTabKeyDown(event, tab);
              }}
              className={getSegmentedControlOptionClass(isActive)}
            >
              {t(INVENTORY_TAB_LABEL_KEYS[tab])}
            </button>
          );
        })}
      </div>

      <div id={tabs.panelId} role="tabpanel" aria-labelledby={tabs.getTabId(tabs.activeTab)} className="min-w-0">
        {tabs.activeTab === 'parts' ? (
          <PartsCatalogTab
            t={t}
            locale={i18n.language}
            showErrorToast={showErrorToast}
            onOpenCreateModal={catalogMutations.openCreatePartModal}
            onOpenEditModal={catalogMutations.openEditPartModal}
            onOpenDeleteModal={catalogMutations.openDeletePartModal}
          />
        ) : (
          <LaborTypesCatalogTab
            t={t}
            locale={i18n.language}
            showErrorToast={showErrorToast}
            onOpenCreateModal={catalogMutations.openCreateLaborTypeModal}
            onOpenEditModal={catalogMutations.openEditLaborTypeModal}
            onOpenDeleteModal={catalogMutations.openDeleteLaborTypeModal}
          />
        )}
      </div>

      <CatalogFormModal
        isOpen={catalogMutations.partModalOpen}
        mode={catalogMutations.partModalMode}
        isSaving={catalogMutations.isSavingPart}
        isSaveEnabled={catalogMutations.isPartSaveEnabled}
        form={catalogMutations.partForm}
        fieldErrors={catalogMutations.partFieldErrors}
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
        fieldErrors={catalogMutations.laborTypeFieldErrors}
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
