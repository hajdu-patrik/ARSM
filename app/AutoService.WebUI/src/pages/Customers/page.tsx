/**
 * Customers registry page.
 *
 * Provides customer and vehicle CRUD operations together with customer-level
 * and vehicle-level repair history panels.
 * @module pages/Customers/page
 */

import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFirstFieldErrorMessage } from '../../utils/serverValidation';
import { useToastStore } from '../../store/toast.store';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';
import { useCustomersListState } from './hooks/useCustomersListState';
import { useCustomerMutations } from './hooks/useCustomerMutations';
import { useVehicleMutations } from './hooks/useVehicleMutations';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerListSection } from './components/CustomerListSection';
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
        locale={i18n.language}
        searchTerm={listState.searchTerm}
        filteredCustomers={listState.filteredCustomers}
        isLoadingCustomers={listState.isLoadingCustomers}
        expandedCustomerIds={listState.expandedCustomerIds}
        vehiclesByCustomerId={listState.vehiclesByCustomerId}
        isLoadingVehiclesByCustomerId={listState.isLoadingVehiclesByCustomerId}
        customerHistoryByCustomerId={listState.customerHistoryByCustomerId}
        isLoadingCustomerHistoryByCustomerId={listState.isLoadingCustomerHistoryByCustomerId}
        customerHistorySortByCustomerId={listState.customerHistorySortByCustomerId}
        vehicleHistoryByVehicleId={listState.vehicleHistoryByVehicleId}
        isLoadingVehicleHistoryByVehicleId={listState.isLoadingVehicleHistoryByVehicleId}
        vehicleHistorySortByVehicleId={listState.vehicleHistorySortByVehicleId}
        activeVehicleHistoryByCustomerId={listState.activeVehicleHistoryByCustomerId}
        onToggleCustomerExpanded={listState.toggleCustomerExpanded}
        onOpenEditCustomerModal={customerMutations.openEditCustomerModal}
        onOpenDeleteCustomerModal={customerMutations.openDeleteCustomerModal}
        onOpenCreateVehicleModal={vehicleMutations.openCreateVehicleModal}
        onOpenEditVehicleModal={vehicleMutations.openEditVehicleModal}
        onOpenDeleteVehicleModal={vehicleMutations.openDeleteVehicleModal}
        onToggleCustomerHistorySort={listState.toggleCustomerHistorySort}
        onToggleVehicleHistory={listState.toggleVehicleHistory}
        onToggleVehicleHistorySort={listState.toggleVehicleHistorySort}
        onOpenHistoryAppointment={setHistoryAppointment}
      />

      <CustomerFormModal
        isOpen={customerMutations.customerModalOpen}
        mode={customerMutations.customerModalMode}
        isSaving={customerMutations.isSavingCustomer}
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
