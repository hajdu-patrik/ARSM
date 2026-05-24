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
import { TOAST_KEY_NO_CHANGES } from '../../../store/toast.keys';
import type { CustomerMutationToastHandlersWithWarning } from './mutation-toast.types';
import type {
  CustomerFormState,
  CustomerModalMode,
} from '../page.types';
import type {
  CreateCustomerRequest,
  CustomerListItem,
  UpdateCustomerRequest,
} from '../../../types/customers/customers.types';

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
};

function buildNormalizedCustomerPayload(form: CustomerFormState): UpdateCustomerRequest {
  return {
    firstName: form.firstName.trim(),
    middleName: form.middleName.trim() || null,
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phoneNumber: form.phoneNumber.trim() || null,
  };
}

function hasRequiredCustomerFields(payload: UpdateCustomerRequest): boolean {
  return payload.firstName.length > 0
    && payload.lastName.length > 0
    && payload.email.length > 0;
}

function hasAnyCustomerFieldValue(payload: UpdateCustomerRequest): boolean {
  return payload.firstName.length > 0
    || (payload.middleName?.length ?? 0) > 0
    || payload.lastName.length > 0
    || payload.email.length > 0
    || (payload.phoneNumber?.length ?? 0) > 0;
}

function hasCustomerUpdateChanges(
  snapshot: CustomerListItem,
  payload: UpdateCustomerRequest,
): boolean {
  return snapshot.firstName !== payload.firstName
    || (snapshot.middleName ?? null) !== payload.middleName
    || snapshot.lastName !== payload.lastName
    || snapshot.email !== payload.email
    || (snapshot.phoneNumber ?? null) !== payload.phoneNumber;
}

/** External dependencies required by customer mutation handlers. */
interface UseCustomerMutationsParams extends CustomerMutationToastHandlersWithWarning {
  getFirstFieldErrorMessage: (errors: ServerFieldErrors) => string | null;
  applyCustomerCreated: (customer: CustomerListItem) => void;
  applyCustomerUpdated: (customerId: number, payload: UpdateCustomerRequest) => void;
  applyCustomerDeleted: (customerId: number) => void;
}

/**
 * Encapsulates customer create/update/delete modal state and server mutations.
 * @param params State setters and notification handlers required by mutation flows.
 * @returns Modal state plus mutation actions for customer operations.
 */
export function useCustomerMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  getFirstFieldErrorMessage,
  applyCustomerCreated,
  applyCustomerUpdated,
  applyCustomerDeleted,
}: UseCustomerMutationsParams) {
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState<CustomerModalMode>('create');
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingCustomerSnapshot, setEditingCustomerSnapshot] = useState<CustomerListItem | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const normalizedCustomerPayload = buildNormalizedCustomerPayload(customerForm);
  const isCustomerSaveEnabled = hasRequiredCustomerFields(normalizedCustomerPayload)
    && (
      customerModalMode === 'create'
        ? hasAnyCustomerFieldValue(normalizedCustomerPayload)
        : Boolean(editingCustomerSnapshot && hasCustomerUpdateChanges(editingCustomerSnapshot, normalizedCustomerPayload))
    )
    && !isSavingCustomer;

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

    const payload: CreateCustomerRequest | UpdateCustomerRequest = buildNormalizedCustomerPayload(customerForm);

    if (
      customerModalMode === 'edit'
      && editingCustomerId !== null
      && editingCustomerSnapshot
      && !hasCustomerUpdateChanges(editingCustomerSnapshot, payload)
    ) {
      showWarningToast(TOAST_KEY_NO_CHANGES);
      return;
    }

    setIsSavingCustomer(true);

    try {
      if (customerModalMode === 'create') {
        const created = await customerRegistryService.createCustomer(payload);
        applyCustomerCreated(created);
        showSuccessToast('customers.toasts.customerCreated');
      } else if (editingCustomerId !== null) {
        await customerRegistryService.updateCustomer(editingCustomerId, payload);
        applyCustomerUpdated(editingCustomerId, payload);
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
    editingCustomerSnapshot,
    applyCustomerCreated,
    applyCustomerUpdated,
    handleSubmitCustomerError,
    showSuccessToast,
    showWarningToast,
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
      applyCustomerDeleted(deleteCustomerTarget.id);

      showSuccessToast('customers.toasts.customerDeleted');
      setDeleteCustomerTarget(null);
    } catch {
      showErrorToast('customers.errors.deleteFailed');
    } finally {
      setIsDeletingCustomer(false);
    }
  }, [
    deleteCustomerTarget,
    applyCustomerDeleted,
    showErrorToast,
    showSuccessToast,
  ]);

  return {
    customerModalOpen,
    customerModalMode,
    customerForm,
    setCustomerForm,
    isSavingCustomer,
    isCustomerSaveEnabled,
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
