/** Password-change workflow state for Settings. */

import { useCallback, useState, type SyntheticEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { profileService } from '../../../services/profile/profile.service';
import type { ChangePasswordRequest } from '../../../types/profile/profile.types';
import { getFirstFieldErrorMessage } from '../../../utils/serverValidation';
import { extractPasswordChangeErrors } from '../handlers';
import {
  NO_PASSWORD_FIELD_ERRORS,
  pickPasswordFieldErrors,
  type PasswordFieldErrors,
  type PasswordFieldName,
} from '../passwordFormPolicy';

interface UsePasswordChangeSettingsParams {
  readonly showSuccessToast: (message: string, options?: Record<string, string | number>) => void;
  readonly showErrorToast: (message: string, options?: Record<string, string | number>) => void;
}

/** Owns password-change field state, frontend validation, per-field server errors and the confirm flow. */
export function usePasswordChangeSettings({
  showSuccessToast,
  showErrorToast,
}: UsePasswordChangeSettingsParams) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>(NO_PASSWORD_FIELD_ERRORS);
  const [isPasswordChangeConfirmOpen, setIsPasswordChangeConfirmOpen] = useState(false);

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

  const handlePasswordChangeConfirmed = useCallback(() => {
    setIsPasswordChangeConfirmOpen(false);
    changePassword({ currentPassword, newPassword, confirmNewPassword });
  }, [changePassword, confirmNewPassword, currentPassword, newPassword]);

  const handlePasswordChangeRequest = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      showErrorToast('common.validation.passwordTooShort');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showErrorToast('common.validation.passwordMismatch');
      return;
    }

    setIsPasswordChangeConfirmOpen(true);
  }, [confirmNewPassword, newPassword, showErrorToast]);

  const closePasswordChangeConfirm = useCallback(() => {
    if (!isChangingPassword) {
      setIsPasswordChangeConfirmOpen(false);
    }
  }, [isChangingPassword]);

  return {
    currentPassword,
    newPassword,
    confirmNewPassword,
    fieldErrors,
    isChangingPassword,
    isPasswordChangeConfirmOpen,
    changeCurrentPassword,
    changeNewPassword,
    changeConfirmNewPassword,
    handlePasswordChangeRequest,
    handlePasswordChangeConfirmed,
    closePasswordChangeConfirm,
  };
}
