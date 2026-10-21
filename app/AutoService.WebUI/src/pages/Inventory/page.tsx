/** Inventory page: Parts and Labor types tabs sharing create/edit/delete modals; active tab reflected in the URL. */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../../store/toast.store';
import { useCatalogItemMutations } from './hooks/useCatalogItemMutations';
import { INVENTORY_TAB_LABEL_KEYS, INVENTORY_TABS, useInventoryTabs } from './hooks/useInventoryTabs';
import { LaborTypesCatalogTab, PartsCatalogTab } from './components/CatalogTabs';
import { CatalogFormModal } from './components/CatalogFormModal';
import { DeleteCatalogItemModal } from './components/DeleteCatalogItemModal';
import { laborTypeCatalogItemConfig, partCatalogItemConfig } from './catalogItem.config';
import {
  getSegmentedControlOptionClass,
  pageHeaderWithSubtitleClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
  segmentedControlClass,
} from '../../utils/formStyles';

/** Inventory route component. */
export const InventoryPage = memo(function InventoryPage() {
  const { t, i18n } = useTranslation();
  const showErrorToast = useToastStore((state) => state.showError);

  const tabs = useInventoryTabs();
  const parts = useCatalogItemMutations(partCatalogItemConfig);
  const laborTypes = useCatalogItemMutations(laborTypeCatalogItemConfig);
  // A pending part deletion wins, as only one delete confirmation can be open at a time.
  const deleting = parts.deleteTarget === null ? laborTypes : parts;

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
            onOpenCreateModal={parts.openCreateModal}
            onOpenEditModal={parts.openEditModal}
            onOpenDeleteModal={parts.openDeleteModal}
          />
        ) : (
          <LaborTypesCatalogTab
            t={t}
            locale={i18n.language}
            showErrorToast={showErrorToast}
            onOpenCreateModal={laborTypes.openCreateModal}
            onOpenEditModal={laborTypes.openEditModal}
            onOpenDeleteModal={laborTypes.openDeleteModal}
          />
        )}
      </div>

      {[parts, laborTypes].map((mutations) => (
        <CatalogFormModal
          key={mutations.formConfig.formElementId}
          isOpen={mutations.modalOpen}
          mode={mutations.modalMode}
          isSaving={mutations.isSaving}
          isSaveEnabled={mutations.isSaveEnabled}
          form={mutations.form}
          fieldErrors={mutations.fieldErrors}
          locale={i18n.language}
          t={t}
          onClose={mutations.closeModal}
          onSubmit={mutations.handleSubmit}
          setForm={mutations.setForm}
          config={mutations.formConfig}
        />
      ))}

      <DeleteCatalogItemModal
        target={deleting.deleteTarget}
        isDeleting={parts.isDeleting || laborTypes.isDeleting}
        t={t}
        onClose={deleting.closeDeleteModal}
        onConfirm={deleting.handleDelete}
      />
    </div>
  );
});

