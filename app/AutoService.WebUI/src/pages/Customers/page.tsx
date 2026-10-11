/** Customers registry page: customer/vehicle CRUD plus customer- and vehicle-level repair history panels. */

import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { getFirstFieldErrorMessage } from '../../utils/serverValidation';
import { useToastStore } from '../../store/toast.store';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';
import { useCustomersListState } from './hooks/useCustomersListState';
import { useCustomersListMutations } from './hooks/useCustomersListMutations';
import { useCustomerMutations } from './hooks/useCustomerMutations';
import { useVehicleMutations } from './hooks/useVehicleMutations';
import { useCustomerDetailsPanel } from './hooks/useCustomerDetailsPanel';
import { CustomerFormModal } from './components/CustomerFormModal';
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

/** Customers registry page container: coordinates customer/vehicle CRUD, search/sort state, and history panels. */
const CustomersPageComponent = memo(function CustomersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const showWarningToast = useToastStore((state) => state.showWarning);
  const [historyAppointment, setHistoryAppointment] = useState<AppointmentDto | null>(null);

  const listState = useCustomersListState({ language: i18n.language });

  const {
    refreshAfterCustomerCreated,
    refreshAfterCustomerUpdated,
    refreshAfterCustomerDeleted,
    refreshAfterVehicleCreated,
    refreshAfterVehicleUpdated,
    refreshAfterVehicleDeleted,
  } = useCustomersListMutations();

  const customerMutations = useCustomerMutations({
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    getFirstFieldErrorMessage,
    refreshAfterCustomerCreated,
    refreshAfterCustomerUpdated,
    refreshAfterCustomerDeleted,
  });

  const vehicleMutations = useVehicleMutations({
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    getFirstFieldErrorMessage,
    refreshAfterVehicleCreated,
    refreshAfterVehicleUpdated,
    refreshAfterVehicleDeleted,
  });

  const detailsPanel = useCustomerDetailsPanel();

  const customerListData = useMemo<CustomerListData>(() => ({
    searchTerm: listState.searchTerm,
    filteredCustomers: listState.filteredCustomers,
    isLoadingCustomers: listState.isLoadingCustomers,
    expandedCustomerIds: listState.expandedCustomerIds,
    detailsTarget: detailsPanel.target,
    locale: i18n.language,
  }), [
    detailsPanel.target,
    i18n.language,
    listState.expandedCustomerIds,
    listState.filteredCustomers,
    listState.isLoadingCustomers,
    listState.searchTerm,
  ]);

  // A quote is anchored to a vehicle, so the vehicle row starts one, and the
  // Quotes page owns the editor from there.
  const handleCreateQuoteForVehicle = useCallback((vehicleId: number) => {
    void navigate(`/quotes?vehicleId=${String(vehicleId)}&new=1`);
  }, [navigate]);

  const handleCloseHistoryAppointment = useCallback(() => {
    setHistoryAppointment(null);
  }, []);

  const customerListActions = useMemo<CustomerListActions>(() => ({
    onToggleCustomerExpanded: listState.toggleCustomerExpanded,
    onOpenCustomerDetails: detailsPanel.openCustomerPanel,
    onOpenEditCustomerModal: customerMutations.openEditCustomerModal,
    onOpenDeleteCustomerModal: customerMutations.openDeleteCustomerModal,
    onOpenCreateVehicleModal: vehicleMutations.openCreateVehicleModal,
    onOpenEditVehicleModal: vehicleMutations.openEditVehicleModal,
    onOpenDeleteVehicleModal: vehicleMutations.openDeleteVehicleModal,
    onOpenVehicleDetails: detailsPanel.openVehiclePanel,
    onCreateQuoteForVehicle: handleCreateQuoteForVehicle,
  }), [
    customerMutations.openDeleteCustomerModal,
    customerMutations.openEditCustomerModal,
    detailsPanel.openCustomerPanel,
    detailsPanel.openVehiclePanel,
    handleCreateQuoteForVehicle,
    listState.toggleCustomerExpanded,
    vehicleMutations.openCreateVehicleModal,
    vehicleMutations.openDeleteVehicleModal,
    vehicleMutations.openEditVehicleModal,
  ]);

  const customerHistoryState = useMemo<CustomerHistoryState>(() => ({
    customerHistorySortByCustomerId: listState.customerHistorySortByCustomerId,
    vehicleHistorySortByVehicleId: listState.vehicleHistorySortByVehicleId,
    onToggleCustomerHistorySort: listState.toggleCustomerHistorySort,
    onToggleVehicleHistorySort: listState.toggleVehicleHistorySort,
    onOpenHistoryAppointment: setHistoryAppointment,
  }), [
    listState.customerHistorySortByCustomerId,
    listState.toggleCustomerHistorySort,
    listState.toggleVehicleHistorySort,
    listState.vehicleHistorySortByVehicleId,
  ]);

  return (
    <div className={`${pageShellClass} flex flex-col gap-6`}>
      <header className={pageHeaderWithSubtitleClass}>
        <h1 className={pageTitleClass}>
          {t('nav.customers')}
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
        fieldErrors={customerMutations.customerFieldErrors}
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
        fieldErrors={vehicleMutations.vehicleFieldErrors}
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
        onClose={handleCloseHistoryAppointment}
      />
    </div>
  );
});

CustomersPageComponent.displayName = 'CustomersPage';

/** Customers route component. */
export const CustomersPage = CustomersPageComponent;
