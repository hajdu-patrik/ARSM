/**
 * Delete-profile confirmation modal for Settings.
 * @module pages/Settings/DeleteProfileConfirmModal
 */

import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import {
  dangerButtonClass,
  inputClass,
  inputGroupContainerClass,
  mutedBodyTextClass,
  passwordToggleButtonClass,
  secondaryButtonClass,
} from './constants';

interface DeleteProfileConfirmModalProps {
  readonly isOpen: boolean;
  readonly isDeleting: boolean;
  readonly deletePassword: string;
  readonly deletePasswordConfirm: string;
  readonly onDeletePasswordChange: (value: string) => void;
  readonly onDeletePasswordConfirmChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

/** Renders the destructive account-delete confirmation modal and credential fields. */
const DeleteProfileConfirmModalComponent = memo(function DeleteProfileConfirmModal({
  isOpen,
  isDeleting,
  deletePassword,
  deletePasswordConfirm,
  onDeletePasswordChange,
  onDeletePasswordConfirmChange,
  onClose,
  onConfirm,
}: DeleteProfileConfirmModalProps) {
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
  if (isDeleting) {
    deleteConfirmDisabledReasonKey = 'settings.deletingProfile';
  } else if (!deletePassword.trim() || !deletePasswordConfirm.trim()) {
    deleteConfirmDisabledReasonKey = 'settings.fillDeletePasswordsToContinue';
  } else if (deletePassword !== deletePasswordConfirm) {
    deleteConfirmDisabledReasonKey = 'settings.deletePasswordsDoNotMatch';
  }

  const deleteConfirmDisabledTitle = deleteConfirmDisabledReasonKey ? t(deleteConfirmDisabledReasonKey) : undefined;

  useEffect(() => {
    if (!isOpen || (deletePassword.length === 0 && deletePasswordConfirm.length === 0)) {
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
  }, [deletePassword, deletePasswordConfirm, isOpen]);

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen, onDeletePasswordChange, onDeletePasswordConfirmChange]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
      title={t('settings.deleteProfileModalTitle')}
      variant="confirm"
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className={secondaryButtonClass}
          >
            {t('settings.cancel')}
          </button>
          <div title={deleteConfirmDisabledTitle}>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting || isDeleteConfirmationInvalid}
              className={dangerButtonClass}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span>{isDeleting ? t('settings.deletingProfile') : t('settings.confirmDeleteProfile')}</span>
            </button>
          </div>
        </>
      )}
    >
      <p className={mutedBodyTextClass}>{t('settings.deleteProfileWarning')}</p>

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
          disabled={isDeleting}
          aria-label={t('settings.currentPassword')}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowDeletePassword((isVisible) => !isVisible)}
          className={`${passwordToggleButtonClass} min-h-11 min-w-11`}
          aria-label={showDeletePassword ? t('settings.hidePassword') : t('settings.showPassword')}
          disabled={isDeleting}
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
          disabled={isDeleting}
          aria-label={t('settings.deleteConfirmPassword')}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowDeletePasswordConfirm((isVisible) => !isVisible)}
          className={`${passwordToggleButtonClass} min-h-11 min-w-11`}
          aria-label={showDeletePasswordConfirm ? t('settings.hidePassword') : t('settings.showPassword')}
          disabled={isDeleting}
        >
          {showDeletePasswordConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </Modal>
  );
});

DeleteProfileConfirmModalComponent.displayName = 'DeleteProfileConfirmModal';

export const DeleteProfileConfirmModal = DeleteProfileConfirmModalComponent;
