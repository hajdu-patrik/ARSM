/**
 * Settings confirmation and delete modals.
 * @module pages/Settings/SettingsActionModals
 */

import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, KeyRound, Save, Trash2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { buttonClass, dangerButtonClass, inputClass, inputGroupContainerClass, passwordToggleButtonClass, secondaryButtonClass } from './constants';

interface SettingsActionModalsProps {
  readonly isPictureRemoveConfirmOpen: boolean;
  readonly isUploadingPicture: boolean;
  readonly onClosePictureRemoveConfirm: () => void;
  readonly onConfirmPictureRemove: () => void;
  readonly isProfileSaveConfirmOpen: boolean;
  readonly isUpdatingProfile: boolean;
  readonly onCloseProfileSaveConfirm: () => void;
  readonly onConfirmProfileSave: () => void;
  readonly isPasswordChangeConfirmOpen: boolean;
  readonly isChangingPassword: boolean;
  readonly onClosePasswordChangeConfirm: () => void;
  readonly onConfirmPasswordChange: () => void;
  readonly isDeleteModalOpen: boolean;
  readonly isDeletingProfile: boolean;
  readonly deletePassword: string;
  readonly deletePasswordConfirm: string;
  readonly onDeletePasswordChange: (value: string) => void;
  readonly onDeletePasswordConfirmChange: (value: string) => void;
  readonly onCloseDeleteModal: () => void;
  readonly onConfirmDeleteProfile: () => void;
}

const SettingsActionModalsComponent = memo(function SettingsActionModals({
  isPictureRemoveConfirmOpen,
  isUploadingPicture,
  onClosePictureRemoveConfirm,
  onConfirmPictureRemove,
  isProfileSaveConfirmOpen,
  isUpdatingProfile,
  onCloseProfileSaveConfirm,
  onConfirmProfileSave,
  isPasswordChangeConfirmOpen,
  isChangingPassword,
  onClosePasswordChangeConfirm,
  onConfirmPasswordChange,
  isDeleteModalOpen,
  isDeletingProfile,
  deletePassword,
  deletePasswordConfirm,
  onDeletePasswordChange,
  onDeletePasswordConfirmChange,
  onCloseDeleteModal,
  onConfirmDeleteProfile,
}: SettingsActionModalsProps) {
  const { t } = useTranslation();
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [showDeletePasswordConfirm, setShowDeletePasswordConfirm] = useState(false);
  const [isDeletePasswordFieldLocked, setIsDeletePasswordFieldLocked] = useState(true);
  const [isDeletePasswordConfirmFieldLocked, setIsDeletePasswordConfirmFieldLocked] = useState(true);
  const isDeleteConfirmationInvalid =
    deletePassword.trim().length === 0
    || deletePasswordConfirm.trim().length === 0
    || deletePassword !== deletePasswordConfirm;

  let deleteConfirmDisabledReasonKey: string | null = null;
  if (isDeletingProfile) {
    deleteConfirmDisabledReasonKey = 'settings.deletingProfile';
  } else if (!deletePassword.trim() || !deletePasswordConfirm.trim()) {
    deleteConfirmDisabledReasonKey = 'settings.fillDeletePasswordsToContinue';
  } else if (deletePassword !== deletePasswordConfirm) {
    deleteConfirmDisabledReasonKey = 'settings.deletePasswordsDoNotMatch';
  }

  const deleteConfirmDisabledTitle = deleteConfirmDisabledReasonKey ? t(deleteConfirmDisabledReasonKey) : undefined;

  useEffect(() => {
    if (!isDeleteModalOpen || (deletePassword.length === 0 && deletePasswordConfirm.length === 0)) {
      const frameId = globalThis.requestAnimationFrame(() => {
        setIsDeletePasswordFieldLocked(true);
        setIsDeletePasswordConfirmFieldLocked(true);
        setShowDeletePassword(false);
        setShowDeletePasswordConfirm(false);
      });

      return () => {
        globalThis.cancelAnimationFrame(frameId);
      };
    }

    return undefined;
  }, [deletePassword, deletePasswordConfirm, isDeleteModalOpen]);

  useEffect(() => {
    if (!isDeleteModalOpen) {
      return;
    }

    const frameId = globalThis.requestAnimationFrame(() => {
      const passwordInput = document.getElementById('delete-profile-password');
      if (passwordInput instanceof HTMLInputElement && passwordInput.value.length > 0) {
        passwordInput.value = '';
        onDeletePasswordChange('');
      }

      const passwordConfirmInput = document.getElementById('delete-profile-password-confirm');
      if (passwordConfirmInput instanceof HTMLInputElement && passwordConfirmInput.value.length > 0) {
        passwordConfirmInput.value = '';
        onDeletePasswordConfirmChange('');
      }
    });

    return () => {
      globalThis.cancelAnimationFrame(frameId);
    };
  }, [isDeleteModalOpen, onDeletePasswordChange, onDeletePasswordConfirmChange]);

  return (
    <>
      <Modal
        isOpen={isPictureRemoveConfirmOpen}
        onClose={() => {
          if (!isUploadingPicture) {
            onClosePictureRemoveConfirm();
          }
        }}
        title={t('settings.confirmPictureRemoveTitle')}
        variant="confirm"
        footer={(
          <>
            <button
              type="button"
              onClick={onClosePictureRemoveConfirm}
              disabled={isUploadingPicture}
              className={secondaryButtonClass}
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmPictureRemove}
              disabled={isUploadingPicture}
              className={dangerButtonClass}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span>{isUploadingPicture ? t('settings.uploading') : t('settings.confirmPictureRemove')}</span>
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.confirmPictureRemoveMessage')}</p>
      </Modal>

      <Modal
        isOpen={isProfileSaveConfirmOpen}
        onClose={() => {
          if (!isUpdatingProfile) {
            onCloseProfileSaveConfirm();
          }
        }}
        title={t('settings.confirmSaveTitle')}
        variant="confirm"
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseProfileSaveConfirm}
              disabled={isUpdatingProfile}
              className={secondaryButtonClass}
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmProfileSave}
              disabled={isUpdatingProfile}
              className={buttonClass}
            >
              <Save className="h-4 w-4 shrink-0" />
              <span>{isUpdatingProfile ? t('settings.saving') : t('settings.confirmSave')}</span>
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.confirmSaveMessage')}</p>
      </Modal>

      <Modal
        isOpen={isPasswordChangeConfirmOpen}
        onClose={() => {
          if (!isChangingPassword) {
            onClosePasswordChangeConfirm();
          }
        }}
        title={t('settings.confirmPasswordChangeTitle')}
        variant="confirm"
        footer={(
          <>
            <button
              type="button"
              onClick={onClosePasswordChangeConfirm}
              disabled={isChangingPassword}
              className={secondaryButtonClass}
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmPasswordChange}
              disabled={isChangingPassword}
              className={buttonClass}
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              <span>{isChangingPassword ? t('settings.changingCredentials') : t('settings.confirmPasswordChange')}</span>
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.confirmPasswordChangeMessage')}</p>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingProfile) {
            onCloseDeleteModal();
          }
        }}
        title={t('settings.deleteProfileModalTitle')}
        variant="confirm"
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseDeleteModal}
              disabled={isDeletingProfile}
              className={secondaryButtonClass}
            >
              {t('settings.cancel')}
            </button>
            <div title={deleteConfirmDisabledTitle}>
              <button
                type="button"
                onClick={onConfirmDeleteProfile}
                disabled={isDeletingProfile || isDeleteConfirmationInvalid}
                className={dangerButtonClass}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span>{isDeletingProfile ? t('settings.deletingProfile') : t('settings.confirmDeleteProfile')}</span>
              </button>
            </div>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.deleteProfileWarning')}</p>

        <input
          type="text"
          name="delete-profile-username-decoy"
          autoComplete="username"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          defaultValue=""
        />

        <input
          type="password"
          name="delete-profile-password-decoy"
          autoComplete="new-password"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          defaultValue=""
        />

        <div className={`mt-4 ${inputGroupContainerClass}`}>
          <input
            id="delete-profile-password"
            type={showDeletePassword ? 'text' : 'password'}
            value={deletePassword}
            onChange={(event) => onDeletePasswordChange(event.target.value)}
            onFocus={() => {
              if (isDeletePasswordFieldLocked) {
                setIsDeletePasswordFieldLocked(false);
              }
            }}
            placeholder={t('settings.currentPasswordPlaceholder')}
            autoComplete="off"
            readOnly={isDeletePasswordFieldLocked}
            name="settings-delete-security-field"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            disabled={isDeletingProfile}
            aria-label={t('settings.currentPassword')}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowDeletePassword((isVisible) => !isVisible)}
            className={`${passwordToggleButtonClass} min-h-11 min-w-11`}
            aria-label={showDeletePassword ? t('settings.hidePassword') : t('settings.showPassword')}
            disabled={isDeletingProfile}
          >
            {showDeletePassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <div className={`mt-4 ${inputGroupContainerClass}`}>
          <input
            id="delete-profile-password-confirm"
            type={showDeletePasswordConfirm ? 'text' : 'password'}
            value={deletePasswordConfirm}
            onChange={(event) => onDeletePasswordConfirmChange(event.target.value)}
            onFocus={() => {
              if (isDeletePasswordConfirmFieldLocked) {
                setIsDeletePasswordConfirmFieldLocked(false);
              }
            }}
            placeholder={t('settings.deleteConfirmPasswordPlaceholder')}
            autoComplete="off"
            readOnly={isDeletePasswordConfirmFieldLocked}
            name="settings-delete-security-confirm-field"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            disabled={isDeletingProfile}
            aria-label={t('settings.deleteConfirmPassword')}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowDeletePasswordConfirm((isVisible) => !isVisible)}
            className={`${passwordToggleButtonClass} min-h-11 min-w-11`}
            aria-label={showDeletePasswordConfirm ? t('settings.hidePassword') : t('settings.showPassword')}
            disabled={isDeletingProfile}
          >
            {showDeletePasswordConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </Modal>
    </>
  );
});

SettingsActionModalsComponent.displayName = 'SettingsActionModals';

export const SettingsActionModals = SettingsActionModalsComponent;