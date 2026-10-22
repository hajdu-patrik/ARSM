/** Password-change form state shared by Settings and the required-change page: the three fields, the
 * per-field server errors, the frontend checks and the change request. */

import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { profileService } from '../services/profile/profile.service';
import type { ChangePasswordRequest } from '../types/profile/profile.types';
import { extractPasswordChangeErrors } from '../utils/passwordChangeErrors';
import {
  NO_PASSWORD_FIELD_ERRORS,
  pickPasswordFieldErrors,
  type PasswordFieldErrors,
  type PasswordFieldName,
} from '../utils/passwordFormPolicy';
import { getFirstFieldErrorMessage } from '../utils/serverValidation';
import { MIN_PASSWORD_LENGTH } from '../utils/validation';

export interface UsePasswordChangeParams {
  readonly showSuccessToast: (message: string, options?: Record<string, string | number>) => void;
  readonly showErrorToast: (message: string, options?: Record<string, string | number>) => void;
  /** Runs after the server accepted the new password, once the success toast is shown and the fields are cleared. */
  readonly onChanged?: (() => void) | undefined;
}

export function usePasswordChange({ showSuccessToast, showErrorToast, onChanged }: UsePasswordChangeParams) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>(NO_PASSWORD_FIELD_ERRORS);

  const handlePasswordChangeFailure = useCallback((error: unknown) => {
    const serverErrors = extractPasswordChangeErrors(error);
    if (serverErrors === null) {
      showErrorToast('toast.passwordChangeFailed');
      return;
    }

    setFieldErrors(pickPasswordFieldErrors(serverErrors));
    showErrorToast(getFirstFieldErrorMessage(serverErrors) ?? 'toast.passwordChangeFailed');
  }, [showErrorToast]);

  const { mutate: changePassword, isPending: isChangingPassword } = useMutation({
    mutationFn: (request: ChangePasswordRequest) => profileService.changePassword(request),
    onSuccess: () => {
      showSuccessToast('toast.passwordChanged');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFieldErrors(NO_PASSWORD_FIELD_ERRORS);
      onChanged?.();
    },
    onError: handlePasswordChangeFailure,
  });

  const clearFieldError = useCallback((field: PasswordFieldName) => {
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  }, []);

  const changeCurrentPassword = useCallback((value: string) => {
    setCurrentPassword(value);
    clearFieldError('currentPassword');
  }, [clearFieldError]);

  const changeNewPassword = useCallback((value: string) => {
    setNewPassword(value);
    clearFieldError('newPassword');
  }, [clearFieldError]);

  const changeConfirmNewPassword = useCallback((value: string) => {
    setConfirmNewPassword(value);
    clearFieldError('confirmNewPassword');
  }, [clearFieldError]);

  /** Toasts and returns false when the new password is too short or differs from its confirmation. */
  const validatePasswordChange = useCallback((): boolean => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showErrorToast('common.validation.passwordTooShort');
      return false;
    }

    if (newPassword !== confirmNewPassword) {
      showErrorToast('common.validation.passwordMismatch');
      return false;
    }

    return true;
  }, [confirmNewPassword, newPassword, showErrorToast]);

  const submitPasswordChange = useCallback(() => {
    changePassword({ currentPassword, newPassword, confirmNewPassword });
  }, [changePassword, confirmNewPassword, currentPassword, newPassword]);

  return {
    currentPassword,
    newPassword,
    confirmNewPassword,
    fieldErrors,
    isChangingPassword,
    changeCurrentPassword,
    changeNewPassword,
    changeConfirmNewPassword,
    validatePasswordChange,
    submitPasswordChange,
  };
}
