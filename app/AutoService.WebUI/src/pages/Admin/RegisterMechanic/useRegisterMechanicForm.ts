/** Registration form state: field values, per-field server errors, the confirmation step and the register mutation. */

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { adminService, type RegisterMechanicRequest } from '../../../services/admin/admin.service';
import { queryKeys } from '../../../services/cache/queryKeys';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { useToastStore } from '../../../store/toast.store';
import {
  getFirstFieldErrorMessage,
  mapAdminValidationMessageToKey,
  normalizeServerFieldErrors,
} from '../../../utils/serverValidation';
import { NO_REGISTER_FIELD_ERRORS, pickConflictFieldError, pickRegisterFieldErrors } from './fieldErrors';
import { buildRegisterMechanicRequest, canSubmitForm, emptyRegisterMechanicFormValues } from './helpers';
import type { RegisterFieldErrors, RegisterMechanicFormValues, RegisterTextFieldName } from './types';

/** Error body of a rejected registration: a field-error dictionary and/or a single detail message. */
interface RegistrationErrorBody {
  errors?: Record<string, string[]>;
  detail?: string;
}

/** Maps a server message to its message key, or to the generic admin error when no mapping exists. */
function mapAdminMessageToToastKey(message: string): string {
  const mappedMessage = mapAdminValidationMessageToKey(message);
  return mappedMessage === message ? 'admin.genericError' : mappedMessage;
}

/** Owns the registration form: values, server errors per field, the confirm modal and the register mutation. */
export function useRegisterMechanicForm() {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const [formValues, setFormValues] = useState<RegisterMechanicFormValues>(emptyRegisterMechanicFormValues);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>(NO_REGISTER_FIELD_ERRORS);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegisterConfirmOpen, setIsRegisterConfirmOpen] = useState(false);
  const [pendingRegisterEmail, setPendingRegisterEmail] = useState('');

  const resetForm = useCallback(() => {
    setFormValues(emptyRegisterMechanicFormValues());
    setFieldErrors(NO_REGISTER_FIELD_ERRORS);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, []);

  /** Maps a registration error to inline field errors, falling back to a toast message. */
  const handleSubmitError = useCallback((error: unknown) => {
    if (!isAxiosError<RegistrationErrorBody>(error)) {
      showErrorToast('admin.genericError');
      return;
    }

    if (error.response?.status === 403) {
      showErrorToast('admin.forbidden');
      return;
    }

    const data = error.response?.data;
    const normalizedFieldErrors = normalizeServerFieldErrors(data?.errors ?? {}, mapAdminMessageToToastKey);

    if (Object.keys(normalizedFieldErrors).length > 0) {
      setFieldErrors(pickRegisterFieldErrors(normalizedFieldErrors));
      showErrorToast(getFirstFieldErrorMessage(normalizedFieldErrors) ?? 'admin.genericError');
      return;
    }

    if (data?.detail) {
      const detailKey = mapAdminMessageToToastKey(data.detail);
      setFieldErrors(pickConflictFieldError(detailKey));
      showErrorToast(detailKey);
      return;
    }

    showErrorToast('admin.genericError');
  }, [showErrorToast]);

  const { mutate: registerMechanic, isPending: isSubmitting } = useMutation({
    mutationFn: (request: RegisterMechanicRequest) => adminService.registerMechanic(request),
    onSuccess: (response) => {
      showSuccessToast('admin.successMessage', { email: response.email });
      resetForm();

      if (scope !== null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.admin.mechanics(scope) });
      }
    },
    onError: handleSubmitError,
  });

  const setFieldValue = useCallback((field: RegisterTextFieldName, value: string) => {
    setFormValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  }, []);

  const toggleExpertise = useCallback((value: string) => {
    setFormValues((previous) => ({
      ...previous,
      expertise: previous.expertise.includes(value)
        ? previous.expertise.filter((item) => item !== value)
        : [...previous.expertise, value],
    }));
    setFieldErrors((previous) => ({ ...previous, expertise: undefined }));
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((previous) => !previous);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((previous) => !previous);
  }, []);

  /** Validates password confirmation and opens the registration confirmation modal. */
  const handleSubmit = useCallback((event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formValues.password !== formValues.confirmPassword) {
      showErrorToast('common.validation.passwordMismatch');
      return;
    }

    setPendingRegisterEmail(formValues.email.trim());
    setIsRegisterConfirmOpen(true);
  }, [formValues, showErrorToast]);

  /** Registers the mechanic; the roster refreshes and the form resets once the server accepted it. */
  const handleRegisterConfirmed = useCallback(() => {
    setIsRegisterConfirmOpen(false);
    registerMechanic(buildRegisterMechanicRequest(formValues));
  }, [formValues, registerMechanic]);

  const closeRegisterConfirm = useCallback(() => {
    if (!isSubmitting) {
      setIsRegisterConfirmOpen(false);
    }
  }, [isSubmitting]);

  return {
    formValues,
    fieldErrors,
    showPassword,
    showConfirmPassword,
    isSubmitting,
    canSubmit: canSubmitForm(formValues, isSubmitting),
    isRegisterConfirmOpen,
    pendingRegisterEmail,
    setFieldValue,
    toggleExpertise,
    toggleShowPassword,
    toggleShowConfirmPassword,
    handleSubmit,
    handleRegisterConfirmed,
    closeRegisterConfirm,
  };
}
