/**
 * Password-change workflow state for Settings.
 * @module pages/Settings/hooks/usePasswordChangeSettings
 */

import { useCallback, useState, type SyntheticEvent } from 'react';
import { profileService } from '../../../services/profile/profile.service';
import { getFirstFieldErrorMessage } from '../../../utils/serverValidation';
import { extractPasswordChangeErrors } from '../handlers';

interface UsePasswordChangeSettingsParams {
  readonly showSuccessToast: (message: string, options?: Record<string, string | number>) => void;
  readonly showErrorToast: (message: string, options?: Record<string, string | number>) => void;
}

/** Owns password-change field state, frontend validation, and confirm flow. */
export function usePasswordChangeSettings({
  showSuccessToast,
  showErrorToast,
}: UsePasswordChangeSettingsParams) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordChangeConfirmOpen, setIsPasswordChangeConfirmOpen] = useState(false);

  const handlePasswordChangeFailure = useCallback((err: unknown) => {
    const normalizedFieldErrors = extractPasswordChangeErrors(err);
    if (normalizedFieldErrors) {
      showErrorToast(getFirstFieldErrorMessage(normalizedFieldErrors) ?? 'toast.passwordChangeFailed');
      return;
    }

    showErrorToast('toast.passwordChangeFailed');
  }, [showErrorToast]);

  const handlePasswordChangeConfirmed = useCallback(async () => {
    setIsPasswordChangeConfirmOpen(false);
    setIsChangingPassword(true);
    try {
      await profileService.changePassword({ currentPassword, newPassword, confirmNewPassword });
      showSuccessToast('toast.passwordChanged');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      handlePasswordChangeFailure(err);
    } finally {
      setIsChangingPassword(false);
    }
  }, [confirmNewPassword, currentPassword, handlePasswordChangeFailure, newPassword, showSuccessToast]);

  const handlePasswordChangeRequest = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      showErrorToast('settings.passwordTooShort');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showErrorToast('settings.passwordsDoNotMatch');
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
    isChangingPassword,
    isPasswordChangeConfirmOpen,
    setCurrentPassword,
    setNewPassword,
    setConfirmNewPassword,
    handlePasswordChangeRequest,
    handlePasswordChangeConfirmed,
    closePasswordChangeConfirm,
  };
}
