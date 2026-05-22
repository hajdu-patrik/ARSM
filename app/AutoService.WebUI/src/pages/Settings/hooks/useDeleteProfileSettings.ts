/**
 * Delete-profile workflow state for Settings.
 * @module pages/Settings/hooks/useDeleteProfileSettings
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../../../services/profile/profile.service';
import { extractDeleteProfileErrorKey } from '../handlers';

interface UseDeleteProfileSettingsParams {
  readonly clearAuth: () => void;
  readonly showSuccessToast: (message: string, options?: Record<string, string | number>) => void;
  readonly showErrorToast: (message: string, options?: Record<string, string | number>) => void;
}

/** Owns account deletion modal state, password confirmation, and logout navigation. */
export function useDeleteProfileSettings({
  clearAuth,
  showSuccessToast,
  showErrorToast,
}: UseDeleteProfileSettingsParams) {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordConfirm, setDeletePasswordConfirm] = useState('');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  const handleDeleteProfileFailure = useCallback((err: unknown) => {
    const errorKey = extractDeleteProfileErrorKey(err);
    if (errorKey) {
      showErrorToast(errorKey);
      return;
    }
    showErrorToast('toast.profileDeleteFailed');
  }, [showErrorToast]);

  const openDeleteModal = useCallback(() => {
    setDeletePassword('');
    setDeletePasswordConfirm('');
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeletingProfile) {
      return;
    }

    setIsDeleteModalOpen(false);
    setDeletePassword('');
    setDeletePasswordConfirm('');
  }, [isDeletingProfile]);

  const handleDeleteProfile = useCallback(async () => {
    if (!deletePassword.trim() || !deletePasswordConfirm.trim()) {
      showErrorToast('settings.currentPasswordRequired');
      return;
    }

    if (deletePassword !== deletePasswordConfirm) {
      showErrorToast('settings.deletePasswordsDoNotMatch');
      return;
    }

    setIsDeletingProfile(true);

    try {
      await profileService.deleteProfile({ currentPassword: deletePassword });
      localStorage.removeItem('autoservice-session-hint');
      clearAuth();
      showSuccessToast('toast.profileDeleted');
      closeDeleteModal();
      navigate('/login', { replace: true });
    } catch (err) {
      handleDeleteProfileFailure(err);
    } finally {
      setIsDeletingProfile(false);
    }
  }, [clearAuth, closeDeleteModal, deletePassword, deletePasswordConfirm, handleDeleteProfileFailure, navigate, showErrorToast, showSuccessToast]);

  return {
    isDeleteModalOpen,
    isDeletingProfile,
    deletePassword,
    deletePasswordConfirm,
    setDeletePassword,
    setDeletePasswordConfirm,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteProfile,
  };
}
