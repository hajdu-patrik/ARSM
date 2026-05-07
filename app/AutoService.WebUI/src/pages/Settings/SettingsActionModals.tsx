/**
 * Settings confirmation and delete modals.
 * @module pages/Settings/SettingsActionModals
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/common/Modal';
import { inputClass, labelClass } from './constants';

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
  readonly onDeletePasswordChange: (value: string) => void;
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
  onDeletePasswordChange,
  onCloseDeleteModal,
  onConfirmDeleteProfile,
}: SettingsActionModalsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Modal
        isOpen={isPictureRemoveConfirmOpen}
        onClose={onClosePictureRemoveConfirm}
        title={t('settings.confirmPictureRemoveTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={onClosePictureRemoveConfirm}
              disabled={isUploadingPicture}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmPictureRemove}
              disabled={isUploadingPicture}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-error-accent px-4 py-2.5 text-sm font-semibold text-arsm-on-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-active disabled:cursor-not-allowed disabled:opacity-60 dark:text-arsm-on-accent-dark"
            >
              {isUploadingPicture ? t('settings.uploading') : t('settings.confirmPictureRemove')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.confirmPictureRemoveMessage')}</p>
      </Modal>

      <Modal
        isOpen={isProfileSaveConfirmOpen}
        onClose={onCloseProfileSaveConfirm}
        title={t('settings.confirmSaveTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseProfileSaveConfirm}
              disabled={isUpdatingProfile}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmProfileSave}
              disabled={isUpdatingProfile}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-4 py-2.5 text-sm font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover disabled:cursor-not-allowed disabled:bg-arsm-accent-border dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:disabled:bg-arsm-ring-dark"
            >
              {isUpdatingProfile ? t('settings.saving') : t('settings.confirmSave')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.confirmSaveMessage')}</p>
      </Modal>

      <Modal
        isOpen={isPasswordChangeConfirmOpen}
        onClose={onClosePasswordChangeConfirm}
        title={t('settings.confirmPasswordChangeTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={onClosePasswordChangeConfirm}
              disabled={isChangingPassword}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmPasswordChange}
              disabled={isChangingPassword}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-4 py-2.5 text-sm font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover disabled:cursor-not-allowed disabled:bg-arsm-accent-border dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:disabled:bg-arsm-ring-dark"
            >
              {isChangingPassword ? t('settings.changingCredentials') : t('settings.confirmPasswordChange')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.confirmPasswordChangeMessage')}</p>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={onCloseDeleteModal}
        title={t('settings.deleteProfileModalTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseDeleteModal}
              disabled={isDeletingProfile}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmDeleteProfile}
              disabled={isDeletingProfile}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-error-accent px-4 py-2.5 text-sm font-semibold text-arsm-on-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-active disabled:cursor-not-allowed disabled:opacity-60 dark:text-arsm-on-accent-dark"
            >
              {isDeletingProfile ? t('settings.deletingProfile') : t('settings.confirmDeleteProfile')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.deleteProfileWarning')}</p>

        <div className="mt-4">
          <label htmlFor="delete-profile-password" className={labelClass}>
            {t('settings.currentPassword')}
          </label>
          <input
            id="delete-profile-password"
            type="password"
            value={deletePassword}
            onChange={(event) => onDeletePasswordChange(event.target.value)}
            placeholder={t('settings.currentPasswordPlaceholder')}
            autoComplete="current-password"
            disabled={isDeletingProfile}
            className={inputClass}
          />
        </div>
      </Modal>
    </>
  );
});

SettingsActionModalsComponent.displayName = 'SettingsActionModals';

export const SettingsActionModals = SettingsActionModalsComponent;