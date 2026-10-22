/** Customers registry page: customer/vehicle CRUD plus customer- and vehicle-level repair history panels. */

import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/auth.store';
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

/** Customers registry page container: coordinates customer/vehicle CRUD, search state, and history panels. */
const CustomersPageComponent = memo(function CustomersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const showWarningToast = useToastStore((state) => state.showWarning);
  const isAdmin = useAuthStore((state) => state.user?.isAdmin ?? false);
  const [historyAppointment, setHistoryAppointment] = useState<AppointmentDto | null>(null);

  const listState = useCustomersListState();

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
    refreshAfterCustomerCreated,
    refreshAfterCustomerUpdated,
    refreshAfterCustomerDeleted,
  });

  const vehicleMutations = useVehicleMutations({
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    refreshAfterVehicleCreated,
    refreshAfterVehicleUpdated,
    refreshAfterVehicleDeleted,
  });

  const detailsPanel = useCustomerDetailsPanel();

  const customerListData = useMemo<CustomerListData>(() => ({
    searchTerm: listState.highlightTerm,
    customers: listState.customers,
    listRef: listState.listRef,
    paging: {
      page: listState.page,
      pageSize: listState.pageSize,
      totalCount: listState.totalCount,
      isLoading: listState.isPageLoading,
      onPageChange: listState.setPage,
    },
    isLoadingCustomers: listState.isLoadingCustomers,
    hasLoadFailed: listState.hasLoadFailed,
    expandedCustomerIds: listState.expandedCustomerIds,
    detailsTarget: detailsPanel.target,
    locale: i18n.language,
  }), [
    detailsPanel.target,
    i18n.language,
    listState.expandedCustomerIds,
    listState.customers,
    listState.highlightTerm,
    listState.hasLoadFailed,
    listState.isLoadingCustomers,
    listState.isPageLoading,
    listState.listRef,
    listState.page,
    listState.pageSize,
    listState.setPage,
    listState.totalCount,
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
    onOpenDeleteCustomerModal: isAdmin ? customerMutations.openDeleteCustomerModal : undefined,
    onOpenCreateVehicleModal: vehicleMutations.openCreateVehicleModal,
    onOpenEditVehicleModal: vehicleMutations.openEditVehicleModal,
    onOpenDeleteVehicleModal: isAdmin ? vehicleMutations.openDeleteVehicleModal : undefined,
    onOpenVehicleDetails: detailsPanel.openVehiclePanel,
    onCreateQuoteForVehicle: handleCreateQuoteForVehicle,
  }), [
    customerMutations.openDeleteCustomerModal,
    customerMutations.openEditCustomerModal,
    detailsPanel.openCustomerPanel,
    detailsPanel.openVehiclePanel,
    handleCreateQuoteForVehicle,
    isAdmin,
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
        onSearchChange={listState.setSearchTerm}
        onClearSearch={listState.clearSearch}
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
