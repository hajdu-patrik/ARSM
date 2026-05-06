/**
 * Customers registry page.
 *
 * Provides customer and vehicle CRUD operations together with customer-level
 * and vehicle-level repair history panels.
 * @module pages/Customers/page
 */

import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ServerFieldErrors } from '../../utils/serverValidation';
import { useToastStore } from '../../store/toast.store';
import { useCustomersListState } from './hooks/useCustomersListState';
import { useCustomerMutations } from './hooks/useCustomerMutations';
import { useVehicleMutations } from './hooks/useVehicleMutations';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerListSection } from './components/CustomerListSection';
import { CustomersToolbar } from './components/CustomersToolbar';
import { DeleteCustomerModal } from './components/DeleteCustomerModal';
import { DeleteVehicleModal } from './components/DeleteVehicleModal';
import { VehicleFormModal } from './components/VehicleFormModal';

/**
 * Customers registry page container that coordinates customer and vehicle CRUD,
 * search/sort state, and repair-history panels.
 */
const CustomersPageComponent = memo(function CustomersPage() {
  const { t, i18n } = useTranslation();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const getFirstFieldErrorMessage = useCallback((errors: ServerFieldErrors): string | null => {
    for (const values of Object.values(errors)) {
      if (values.length > 0) {
        return values[0];
      }
    }

    return null;
  }, []);

  const listState = useCustomersListState({
    language: i18n.language,
    showErrorToast,
  });

  const customerMutations = useCustomerMutations({
    showSuccessToast,
    showErrorToast,
    getFirstFieldErrorMessage,
    setCustomers: listState.setCustomers,
    setVehiclesByCustomerId: listState.setVehiclesByCustomerId,
    setCustomerHistoryByCustomerId: listState.setCustomerHistoryByCustomerId,
    setActiveVehicleHistoryByCustomerId: listState.setActiveVehicleHistoryByCustomerId,
    setExpandedCustomerIds: listState.setExpandedCustomerIds,
  });

  const vehicleMutations = useVehicleMutations({
    showSuccessToast,
    showErrorToast,
    getFirstFieldErrorMessage,
    customerHistoryByCustomerId: listState.customerHistoryByCustomerId,
    vehicleHistoryByVehicleId: listState.vehicleHistoryByVehicleId,
    setCustomers: listState.setCustomers,
    setVehiclesByCustomerId: listState.setVehiclesByCustomerId,
    setVehicleHistoryByVehicleId: listState.setVehicleHistoryByVehicleId,
    setActiveVehicleHistoryByCustomerId: listState.setActiveVehicleHistoryByCustomerId,
    loadCustomerHistory: listState.loadCustomerHistory,
    loadVehicleHistory: listState.loadVehicleHistory,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 max-[320px]:px-3 max-[320px]:py-5 sm:px-6 sm:py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-arsm-primary dark:text-arsm-primary-dark">
          {t('customers.pageTitle')}
        </h1>
        <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.pageDescription')}</p>
      </header>

      <CustomersToolbar
        t={t}
        searchTerm={listState.searchTerm}
        sortField={listState.sortField}
        sortDirection={listState.sortDirection}
        onSearchChange={listState.setSearchTerm}
        onClearSearch={listState.clearSearch}
        onSortFieldChange={listState.handleSortFieldChange}
        onToggleSortDirection={listState.toggleSortDirection}
        onOpenCreateCustomerModal={customerMutations.openCreateCustomerModal}
      />

      <CustomerListSection
        t={t}
        locale={i18n.language}
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
        onConfirm={() => { void customerMutations.handleDeleteCustomer(); }}
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
        onConfirm={() => { void vehicleMutations.handleDeleteVehicle(); }}
      />
    </div>
  );
});

CustomersPageComponent.displayName = 'CustomersPage';

/** Customers route component. */
export const CustomersPage = CustomersPageComponent;
