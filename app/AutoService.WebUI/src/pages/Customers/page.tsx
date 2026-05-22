/**
 * Customers registry page.
 *
 * Provides customer and vehicle CRUD operations together with customer-level
 * and vehicle-level repair history panels.
 * @module pages/Customers/page
 */

import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFirstFieldErrorMessage } from '../../utils/serverValidation';
import { useToastStore } from '../../store/toast.store';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';
import { useCustomersListState } from './hooks/useCustomersListState';
import { useCustomerMutations } from './hooks/useCustomerMutations';
import { useVehicleMutations } from './hooks/useVehicleMutations';
import { useCustomerDetailsPanel } from './hooks/useCustomerDetailsPanel';
import { CustomerFormModal } from './components/CustomerFormModal';
import type { ResolvedCustomerDetailsPanelTarget } from './components/CustomerDetailsPanel';
import { CustomerListSection } from './components/CustomerListSection';
import type { CustomerHistoryState, CustomerListActions, CustomerListData } from './components/customerListSection.types';
import { CustomersToolbar } from './components/CustomersToolbar';
import { DeleteCustomerModal } from './components/DeleteCustomerModal';
import { DeleteVehicleModal } from './components/DeleteVehicleModal';
import { HistoryAppointmentModal } from './components/HistoryAppointmentModal';
import { VehicleFormModal } from './components/VehicleFormModal';
import {
  pageHeaderWithSubtitleClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
} from '../../utils/formStyles';

/**
 * Customers registry page container that coordinates customer and vehicle CRUD,
 * search/sort state, and repair-history panels.
 */
const CustomersPageComponent = memo(function CustomersPage() {
  const { t, i18n } = useTranslation();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const [historyAppointment, setHistoryAppointment] = useState<AppointmentDto | null>(null);

  const listState = useCustomersListState({
    language: i18n.language,
    showErrorToast,
  });

  const customerMutations = useCustomerMutations({
    showSuccessToast,
    showErrorToast,
    getFirstFieldErrorMessage,
    applyCustomerCreated: listState.applyCustomerCreated,
    applyCustomerUpdated: listState.applyCustomerUpdated,
    applyCustomerDeleted: listState.applyCustomerDeleted,
  });

  const vehicleMutations = useVehicleMutations({
    showSuccessToast,
    showErrorToast,
    getFirstFieldErrorMessage,
    customerHistoryByCustomerId: listState.customerHistoryByCustomerId,
    vehicleHistoryByVehicleId: listState.vehicleHistoryByVehicleId,
    applyVehicleCreated: listState.applyVehicleCreated,
    applyVehicleUpdated: listState.applyVehicleUpdated,
    applyVehicleDeleted: listState.applyVehicleDeleted,
    loadCustomerHistory: listState.loadCustomerHistory,
    loadVehicleHistory: listState.loadVehicleHistory,
  });

  const detailsPanel = useCustomerDetailsPanel({
    loadCustomerHistory: listState.loadCustomerHistory,
    loadVehicleHistory: listState.loadVehicleHistory,
  });

  const resolvedDetailsTarget = useMemo<ResolvedCustomerDetailsPanelTarget | null>(() => {
    const target = detailsPanel.target;
    if (!target) {
      return null;
    }

    const customer = listState.customers.find((item) => item.id === target.customerId);
    if (!customer) {
      return null;
    }

    if (target.kind === 'customer') {
      return { kind: 'customer', customer };
    }

    const vehicle = (listState.vehiclesByCustomerId[customer.id] ?? [])
      .find((item) => item.id === target.vehicleId);

    return vehicle ? { kind: 'vehicle', customer, vehicle } : null;
  }, [detailsPanel.target, listState.customers, listState.vehiclesByCustomerId]);

  const customerListData = useMemo<CustomerListData>(() => ({
    searchTerm: listState.searchTerm,
    filteredCustomers: listState.filteredCustomers,
    isLoadingCustomers: listState.isLoadingCustomers,
    expandedCustomerIds: listState.expandedCustomerIds,
    vehiclesByCustomerId: listState.vehiclesByCustomerId,
    isLoadingVehiclesByCustomerId: listState.isLoadingVehiclesByCustomerId,
    resolvedDetailsTarget,
    locale: i18n.language,
  }), [
    i18n.language,
    listState.expandedCustomerIds,
    listState.filteredCustomers,
    listState.isLoadingCustomers,
    listState.isLoadingVehiclesByCustomerId,
    listState.searchTerm,
    listState.vehiclesByCustomerId,
    resolvedDetailsTarget,
  ]);

  const customerListActions = useMemo<CustomerListActions>(() => ({
    onToggleCustomerExpanded: listState.toggleCustomerExpanded,
    onOpenCustomerDetails: detailsPanel.openCustomerPanel,
    onOpenEditCustomerModal: customerMutations.openEditCustomerModal,
    onOpenDeleteCustomerModal: customerMutations.openDeleteCustomerModal,
    onOpenCreateVehicleModal: vehicleMutations.openCreateVehicleModal,
    onOpenEditVehicleModal: vehicleMutations.openEditVehicleModal,
    onOpenDeleteVehicleModal: vehicleMutations.openDeleteVehicleModal,
    onOpenVehicleDetails: detailsPanel.openVehiclePanel,
  }), [
    customerMutations.openDeleteCustomerModal,
    customerMutations.openEditCustomerModal,
    detailsPanel.openCustomerPanel,
    detailsPanel.openVehiclePanel,
    listState.toggleCustomerExpanded,
    vehicleMutations.openCreateVehicleModal,
    vehicleMutations.openDeleteVehicleModal,
    vehicleMutations.openEditVehicleModal,
  ]);

  const customerHistoryState = useMemo<CustomerHistoryState>(() => ({
    customerHistoryByCustomerId: listState.customerHistoryByCustomerId,
    isLoadingCustomerHistoryByCustomerId: listState.isLoadingCustomerHistoryByCustomerId,
    customerHistorySortByCustomerId: listState.customerHistorySortByCustomerId,
    vehicleHistoryByVehicleId: listState.vehicleHistoryByVehicleId,
    isLoadingVehicleHistoryByVehicleId: listState.isLoadingVehicleHistoryByVehicleId,
    vehicleHistorySortByVehicleId: listState.vehicleHistorySortByVehicleId,
    onToggleCustomerHistorySort: listState.toggleCustomerHistorySort,
    onToggleVehicleHistorySort: listState.toggleVehicleHistorySort,
    onOpenHistoryAppointment: setHistoryAppointment,
  }), [
    listState.customerHistoryByCustomerId,
    listState.customerHistorySortByCustomerId,
    listState.isLoadingCustomerHistoryByCustomerId,
    listState.isLoadingVehicleHistoryByVehicleId,
    listState.toggleCustomerHistorySort,
    listState.toggleVehicleHistorySort,
    listState.vehicleHistoryByVehicleId,
    listState.vehicleHistorySortByVehicleId,
  ]);

  return (
    <div className={`${pageShellClass} flex flex-col gap-6`}>
      <header className={pageHeaderWithSubtitleClass}>
        <h1 className={pageTitleClass}>
          {t('customers.pageTitle')}
        </h1>
        <p className={pageSubtitleClass}>{t('customers.pageDescription')}</p>
      </header>

      <CustomersToolbar
        t={t}
        searchTerm={listState.searchTerm}
        sortDirection={listState.sortDirection}
        onSearchChange={listState.setSearchTerm}
        onClearSearch={listState.clearSearch}
        onToggleSortDirection={listState.toggleSortDirection}
        onOpenCreateCustomerModal={customerMutations.openCreateCustomerModal}
      />

      <CustomerListSection
        t={t}
        data={customerListData}
        actions={customerListActions}
        history={customerHistoryState}
      />

      <CustomerFormModal
        isOpen={customerMutations.customerModalOpen}
        mode={customerMutations.customerModalMode}
        isSaving={customerMutations.isSavingCustomer}
        isSaveEnabled={customerMutations.isCustomerSaveEnabled}
        form={customerMutations.customerForm}
        t={t}
        onClose={customerMutations.closeCustomerModal}
        onSubmit={customerMutations.handleSubmitCustomer}
        setForm={customerMutations.setCustomerForm}
      />

      <DeleteCustomerModal
        target={customerMutations.deleteCustomerTarget}
        isDeleting={customerMutations.isDeletingCustomer}
        t={t}
        onClose={customerMutations.closeDeleteCustomerModal}
        onConfirm={customerMutations.handleDeleteCustomer}
      />

      <VehicleFormModal
        isOpen={vehicleMutations.vehicleModalOpen}
        mode={vehicleMutations.vehicleModalMode}
        isSaving={vehicleMutations.isSavingVehicle}
        isSaveEnabled={vehicleMutations.isVehicleSaveEnabled}
        form={vehicleMutations.vehicleForm}
        t={t}
        onClose={vehicleMutations.closeVehicleModal}
        onSubmit={vehicleMutations.handleSubmitVehicle}
        setForm={vehicleMutations.setVehicleForm}
      />

      <DeleteVehicleModal
        target={vehicleMutations.deleteVehicleTarget}
        isDeleting={vehicleMutations.isDeletingVehicle}
        t={t}
        onClose={vehicleMutations.closeDeleteVehicleModal}
        onConfirm={vehicleMutations.handleDeleteVehicle}
      />

      <HistoryAppointmentModal
        appointment={historyAppointment}
        locale={i18n.language}
        isOpen={historyAppointment !== null}
        onClose={() => setHistoryAppointment(null)}
      />
    </div>
  );
});

CustomersPageComponent.displayName = 'CustomersPage';

/** Customers route component. */
export const CustomersPage = CustomersPageComponent;
