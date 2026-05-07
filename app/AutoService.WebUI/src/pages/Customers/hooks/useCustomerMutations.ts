import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import {
  extractServerFieldErrors,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import {
  hasServerFieldErrors,
  mapCustomerValidationMessageToKey,
} from '../helpers';
import type {
  CustomerFormState,
  CustomerModalMode,
} from '../page.types';
import type {
  CreateCustomerRequest,
  CustomerListItem,
  UpdateCustomerRequest,
  VehicleDetailDto,
} from '../../../types/customers/customers.types';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
};

/** External dependencies required by customer mutation handlers. */
interface UseCustomerMutationsParams {
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  getFirstFieldErrorMessage: (errors: ServerFieldErrors) => string | null;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerListItem[]>>;
  setVehiclesByCustomerId: React.Dispatch<React.SetStateAction<Record<number, VehicleDetailDto[]>>>;
  setCustomerHistoryByCustomerId: React.Dispatch<React.SetStateAction<Record<number, AppointmentDto[]>>>;
  setActiveVehicleHistoryByCustomerId: React.Dispatch<React.SetStateAction<Record<number, number | null>>>;
  setExpandedCustomerIds: React.Dispatch<React.SetStateAction<Set<number>>>;
}

/**
 * Encapsulates customer create/update/delete modal state and server mutations.
 * @param params State setters and notification handlers required by mutation flows.
 * @returns Modal state plus mutation actions for customer operations.
 */
export function useCustomerMutations({
  showSuccessToast,
  showErrorToast,
  getFirstFieldErrorMessage,
  setCustomers,
  setVehiclesByCustomerId,
  setCustomerHistoryByCustomerId,
  setActiveVehicleHistoryByCustomerId,
  setExpandedCustomerIds,
}: UseCustomerMutationsParams) {
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState<CustomerModalMode>('create');
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingCustomerSnapshot, setEditingCustomerSnapshot] = useState<CustomerListItem | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<CustomerListItem | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  const openCreateCustomerModal = useCallback(() => {
    setCustomerModalMode('create');
    setEditingCustomerId(null);
    setEditingCustomerSnapshot(null);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerModalOpen(true);
  }, []);

  const openEditCustomerModal = useCallback((customer: CustomerListItem) => {
    setCustomerModalMode('edit');
    setEditingCustomerId(customer.id);
    setEditingCustomerSnapshot(customer);
    setCustomerForm({
      firstName: customer.firstName,
      middleName: customer.middleName ?? '',
      lastName: customer.lastName,
      email: customer.email,
      phoneNumber: customer.phoneNumber ?? '',
    });
    setCustomerModalOpen(true);
  }, []);

  const hasRequiredFieldError = useCallback((errors: ServerFieldErrors, fieldName: string) => {
    const variants = [fieldName, fieldName.toLowerCase(), fieldName.charAt(0).toUpperCase() + fieldName.slice(1)];
    return variants.some((variant) => (errors[variant] ?? []).includes('customers.errors.fieldRequired'));
  }, []);

  const restoreRequiredCustomerFields = useCallback((errors: ServerFieldErrors) => {
    if (customerModalMode !== 'edit' || !editingCustomerSnapshot) {
      return;
    }

    setCustomerForm((prev) => ({
      ...prev,
      firstName: !prev.firstName.trim() && hasRequiredFieldError(errors, 'firstName')
        ? editingCustomerSnapshot.firstName
        : prev.firstName,
      lastName: !prev.lastName.trim() && hasRequiredFieldError(errors, 'lastName')
        ? editingCustomerSnapshot.lastName
        : prev.lastName,
      email: !prev.email.trim() && hasRequiredFieldError(errors, 'email')
        ? editingCustomerSnapshot.email
        : prev.email,
    }));
  }, [customerModalMode, editingCustomerSnapshot, hasRequiredFieldError]);

  const handleSubmitCustomerError = useCallback((error: unknown) => {
    if (!isAxiosError<{ detail?: string; errors?: ServerFieldErrors }>(error)) {
      showErrorToast('customers.errors.saveFailed');
      return;
    }

    const responseData = error.response?.data;
    const mappedFieldErrors = normalizeServerFieldErrors(
      extractServerFieldErrors(responseData),
      mapCustomerValidationMessageToKey,
    );

    if (hasServerFieldErrors(mappedFieldErrors)) {
      restoreRequiredCustomerFields(mappedFieldErrors);
      showErrorToast(getFirstFieldErrorMessage(mappedFieldErrors) ?? 'customers.errors.saveFailed');
      return;
    }

    const detailKey = responseData?.detail
      ? mapCustomerValidationMessageToKey(responseData.detail)
      : 'customers.errors.saveFailed';
    showErrorToast(detailKey);
  }, [getFirstFieldErrorMessage, restoreRequiredCustomerFields, showErrorToast]);

  const closeCustomerModal = useCallback(() => {
    if (isSavingCustomer) {
      return;
    }

    setCustomerModalOpen(false);
  }, [isSavingCustomer]);

  const handleSubmitCustomer = useCallback(async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setIsSavingCustomer(true);

    const payload: CreateCustomerRequest | UpdateCustomerRequest = {
      firstName: customerForm.firstName.trim(),
      middleName: customerForm.middleName.trim() || null,
      lastName: customerForm.lastName.trim(),
      email: customerForm.email.trim(),
      phoneNumber: customerForm.phoneNumber.trim() || null,
    };

    try {
      if (customerModalMode === 'create') {
        const created = await customerRegistryService.createCustomer(payload);
        setCustomers((prev) => [...prev, created]);
        showSuccessToast('customers.toasts.customerCreated');
      } else if (editingCustomerId !== null) {
        await customerRegistryService.updateCustomer(editingCustomerId, payload);
        setCustomers((prev) => prev.map((item) => (
          item.id === editingCustomerId
            ? {
              ...item,
              firstName: payload.firstName,
              middleName: payload.middleName ?? null,
              lastName: payload.lastName,
              email: payload.email,
              phoneNumber: payload.phoneNumber ?? null,
            }
            : item
        )));
        showSuccessToast('customers.toasts.customerUpdated');
      }

      setCustomerModalOpen(false);
    } catch (error) {
      handleSubmitCustomerError(error);
    } finally {
      setIsSavingCustomer(false);
    }
  }, [
    customerForm,
    customerModalMode,
    editingCustomerId,
    handleSubmitCustomerError,
    setCustomers,
    showSuccessToast,
  ]);

  const openDeleteCustomerModal = useCallback((customer: CustomerListItem) => {
    setDeleteCustomerTarget(customer);
  }, []);

  const closeDeleteCustomerModal = useCallback(() => {
    if (isDeletingCustomer) {
      return;
    }

    setDeleteCustomerTarget(null);
  }, [isDeletingCustomer]);

  const handleDeleteCustomer = useCallback(async () => {
    if (!deleteCustomerTarget) {
      return;
    }

    setIsDeletingCustomer(true);

    try {
      await customerRegistryService.deleteCustomer(deleteCustomerTarget.id);
      setCustomers((prev) => prev.filter((item) => item.id !== deleteCustomerTarget.id));
      setVehiclesByCustomerId((prev) => {
        const next = { ...prev };
        delete next[deleteCustomerTarget.id];
        return next;
      });
      setCustomerHistoryByCustomerId((prev) => {
        const next = { ...prev };
        delete next[deleteCustomerTarget.id];
        return next;
      });
      setActiveVehicleHistoryByCustomerId((prev) => {
        const next = { ...prev };
        delete next[deleteCustomerTarget.id];
        return next;
      });
      setExpandedCustomerIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteCustomerTarget.id);
        return next;
      });

      showSuccessToast('customers.toasts.customerDeleted');
      setDeleteCustomerTarget(null);
    } catch {
      showErrorToast('customers.errors.deleteFailed');
    } finally {
      setIsDeletingCustomer(false);
    }
  }, [
    deleteCustomerTarget,
    setActiveVehicleHistoryByCustomerId,
    setCustomerHistoryByCustomerId,
    setCustomers,
    setExpandedCustomerIds,
    setVehiclesByCustomerId,
    showErrorToast,
    showSuccessToast,
  ]);

  return {
    customerModalOpen,
    customerModalMode,
    customerForm,
    setCustomerForm,
    isSavingCustomer,
    deleteCustomerTarget,
    isDeletingCustomer,
    openCreateCustomerModal,
    openEditCustomerModal,
    closeCustomerModal,
    handleSubmitCustomer,
    openDeleteCustomerModal,
    closeDeleteCustomerModal,
    handleDeleteCustomer,
  };
}
