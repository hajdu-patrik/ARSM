import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import {
  extractServerFieldErrors,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import {
  CUSTOMER_FIELD_NAMES,
  CUSTOMER_MESSAGE_FIELDS,
  currentFieldErrors,
  pinFieldErrors,
  pinMessageField,
  type CustomerFieldName,
  type PinnedFieldErrors,
} from '../fieldErrors';
import {
  hasRequiredFieldError,
  hasServerFieldErrors,
  mapCustomerValidationMessageToKey,
} from '../helpers';
import { TOAST_KEY_NO_CHANGES } from '../../../store/toast.keys';
import {
  buildNormalizedCustomerPayload,
  hasAnyCustomerFieldValue,
  hasCustomerUpdateChanges,
  hasRequiredCustomerFields,
} from './customerMutation.helpers';
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

/** Variables of the customer update mutation. */
interface UpdateCustomerVariables {
  readonly customerId: number;
  readonly request: UpdateCustomerRequest;
}

/** External dependencies required by customer mutation handlers. */
interface UseCustomerMutationsParams extends CustomerMutationToastHandlersWithWarning {
  getFirstFieldErrorMessage: (errors: ServerFieldErrors) => string | null;
  refreshAfterCustomerCreated: () => Promise<void>;
  refreshAfterCustomerUpdated: (customerId: number) => Promise<void>;
  refreshAfterCustomerDeleted: () => Promise<void>;
}

/** Encapsulates customer create/update/delete modal state and server mutations. */
export function useCustomerMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  getFirstFieldErrorMessage,
  refreshAfterCustomerCreated,
  refreshAfterCustomerUpdated,
  refreshAfterCustomerDeleted,
}: UseCustomerMutationsParams) {
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState<CustomerModalMode>('create');
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingCustomerSnapshot, setEditingCustomerSnapshot] = useState<CustomerListItem | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);
  const [pinnedFieldErrors, setPinnedFieldErrors] = useState<PinnedFieldErrors<CustomerFieldName>>({});

  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<CustomerListItem | null>(null);

  const customerFieldErrors = currentFieldErrors(pinnedFieldErrors, customerForm, CUSTOMER_FIELD_NAMES);

  const openCreateCustomerModal = useCallback(() => {
    setCustomerModalMode('create');
    setEditingCustomerId(null);
    setEditingCustomerSnapshot(null);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setPinnedFieldErrors({});
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
    setPinnedFieldErrors({});
    setCustomerModalOpen(true);
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
  }, [customerModalMode, editingCustomerSnapshot]);

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
      setPinnedFieldErrors(pinFieldErrors(mappedFieldErrors, customerForm, CUSTOMER_FIELD_NAMES));
      showErrorToast(getFirstFieldErrorMessage(mappedFieldErrors) ?? 'customers.errors.saveFailed');
      return;
    }

    const detailKey = responseData?.detail
      ? mapCustomerValidationMessageToKey(responseData.detail)
      : 'customers.errors.saveFailed';
    setPinnedFieldErrors(pinMessageField(detailKey, CUSTOMER_MESSAGE_FIELDS, customerForm));
    showErrorToast(detailKey);
  }, [customerForm, getFirstFieldErrorMessage, restoreRequiredCustomerFields, showErrorToast]);

  const { mutate: createCustomer, isPending: isCreatingCustomer } = useMutation({
    mutationFn: (request: CreateCustomerRequest) => customerRegistryService.createCustomer(request),
    onSuccess: async () => {
      await refreshAfterCustomerCreated();
      showSuccessToast('customers.toasts.customerCreated');
      setCustomerModalOpen(false);
    },
    onError: handleSubmitCustomerError,
  });

  const { mutate: updateCustomer, isPending: isUpdatingCustomer } = useMutation({
    mutationFn: ({ customerId, request }: UpdateCustomerVariables) => (
      customerRegistryService.updateCustomer(customerId, request)
    ),
    onSuccess: async (_result, { customerId }) => {
      await refreshAfterCustomerUpdated(customerId);
      showSuccessToast('customers.toasts.customerUpdated');
      setCustomerModalOpen(false);
    },
    onError: handleSubmitCustomerError,
  });

  const { mutate: deleteCustomer, isPending: isDeletingCustomer } = useMutation({
    mutationFn: (customerId: number) => customerRegistryService.deleteCustomer(customerId),
    onSuccess: async () => {
      await refreshAfterCustomerDeleted();
      showSuccessToast('customers.toasts.customerDeleted');
      setDeleteCustomerTarget(null);
    },
    onError: () => {
      showErrorToast('customers.errors.deleteFailed');
    },
  });

  const isSavingCustomer = isCreatingCustomer || isUpdatingCustomer;
  const normalizedCustomerPayload = buildNormalizedCustomerPayload(customerForm);
  const isCustomerSaveEnabled = hasRequiredCustomerFields(normalizedCustomerPayload)
    && (
      customerModalMode === 'create'
        ? hasAnyCustomerFieldValue(normalizedCustomerPayload)
        : Boolean(editingCustomerSnapshot && hasCustomerUpdateChanges(editingCustomerSnapshot, normalizedCustomerPayload))
    )
    && !isSavingCustomer;

  const closeCustomerModal = useCallback(() => {
    if (isSavingCustomer) {
      return;
    }

    setCustomerModalOpen(false);
  }, [isSavingCustomer]);

  const handleSubmitCustomer = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();

    const payload = buildNormalizedCustomerPayload(customerForm);

    if (customerModalMode === 'create') {
      createCustomer(payload);
      return;
    }

    if (editingCustomerId === null) {
      return;
    }

    if (editingCustomerSnapshot && !hasCustomerUpdateChanges(editingCustomerSnapshot, payload)) {
      showWarningToast(TOAST_KEY_NO_CHANGES);
      return;
    }

    updateCustomer({ customerId: editingCustomerId, request: payload });
  }, [
    createCustomer,
    customerForm,
    customerModalMode,
    editingCustomerId,
    editingCustomerSnapshot,
    showWarningToast,
    updateCustomer,
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

  const handleDeleteCustomer = useCallback(() => {
    if (deleteCustomerTarget) {
      deleteCustomer(deleteCustomerTarget.id);
    }
  }, [deleteCustomer, deleteCustomerTarget]);

  return {
    customerModalOpen,
    customerModalMode,
    customerForm,
    setCustomerForm,
    customerFieldErrors,
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
