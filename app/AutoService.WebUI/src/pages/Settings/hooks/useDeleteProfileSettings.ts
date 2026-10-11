/** Delete-profile workflow state for Settings. */

import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { clearAuthSessionHint } from '../../../services/auth/session-hint';
import { profileService } from '../../../services/profile/profile.service';
import { CURRENT_PASSWORD_INVALID_KEY, extractDeleteProfileErrorKey } from '../handlers';

interface UseDeleteProfileSettingsParams {
  readonly clearAuth: () => void;
  readonly showSuccessToast: (message: string, options?: Record<string, string | number>) => void;
  readonly showErrorToast: (message: string, options?: Record<string, string | number>) => void;
}

/** Owns account deletion modal state, password confirmation, the delete mutation and logout navigation. */
export function useDeleteProfileSettings({
  clearAuth,
  showSuccessToast,
  showErrorToast,
}: UseDeleteProfileSettingsParams) {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordConfirm, setDeletePasswordConfirm] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState<string | undefined>(undefined);

  const resetDeleteForm = useCallback(() => {
    setDeletePassword('');
    setDeletePasswordConfirm('');
    setDeletePasswordError(undefined);
  }, []);

  const { mutate: deleteProfile, isPending: isDeletingProfile } = useMutation({
    mutationFn: (password: string) => profileService.deleteProfile({ currentPassword: password }),
    onSuccess: () => {
      clearAuthSessionHint();
      clearAuth();
      showSuccessToast('toast.profileDeleted');
      setIsDeleteModalOpen(false);
      resetDeleteForm();
      void navigate('/login', { replace: true });
    },
    onError: (error) => {
      const errorKey = extractDeleteProfileErrorKey(error) ?? 'toast.profileDeleteFailed';

      if (errorKey === CURRENT_PASSWORD_INVALID_KEY) {
        setDeletePasswordError(errorKey);
      }

      showErrorToast(errorKey);
    },
  });

  const changeDeletePassword = useCallback((value: string) => {
    setDeletePassword(value);
    setDeletePasswordError(undefined);
  }, []);

  const openDeleteModal = useCallback(() => {
    resetDeleteForm();
    setIsDeleteModalOpen(true);
  }, [resetDeleteForm]);

  const closeDeleteModal = useCallback(() => {
    if (isDeletingProfile) {
      return;
    }

    setIsDeleteModalOpen(false);
    resetDeleteForm();
  }, [isDeletingProfile, resetDeleteForm]);

  const handleDeleteProfile = useCallback(() => {
    if (!deletePassword.trim() || !deletePasswordConfirm.trim()) {
      showErrorToast('settings.currentPasswordRequired');
      return;
    }

    if (deletePassword !== deletePasswordConfirm) {
      showErrorToast('settings.deletePasswordsDoNotMatch');
      return;
    }

    deleteProfile(deletePassword);
  }, [deletePassword, deletePasswordConfirm, deleteProfile, showErrorToast]);

  return {
    isDeleteModalOpen,
    isDeletingProfile,
    deletePassword,
    deletePasswordConfirm,
    deletePasswordError,
    changeDeletePassword,
    setDeletePasswordConfirm,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteProfile,
  };
}
