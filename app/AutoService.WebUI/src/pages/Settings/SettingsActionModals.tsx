/**
 * Settings confirmation and delete modals.
 * @module pages/Settings/SettingsActionModals
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Save, Trash2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { DeleteProfileConfirmModal } from './DeleteProfileConfirmModal';
import { buttonClass, dangerButtonClass, mutedBodyTextClass, secondaryButtonClass } from './constants';
import { defaultIconClass } from '../../utils/formStyles';

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
              {t('common.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmPictureRemove}
              disabled={isUploadingPicture}
              aria-busy={isUploadingPicture}
              className={dangerButtonClass}
            >
              <Trash2 className={defaultIconClass} />
              <span>{isUploadingPicture ? t('settings.uploading') : t('settings.confirmPictureRemove')}</span>
            </button>
          </>
        )}
      >
        <p className={mutedBodyTextClass}>{t('settings.confirmPictureRemoveMessage')}</p>
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
              {t('common.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmProfileSave}
              disabled={isUpdatingProfile}
              aria-busy={isUpdatingProfile}
              className={buttonClass}
            >
              <Save className={defaultIconClass} />
              <span>{isUpdatingProfile ? t('common.actions.saving') : t('common.actions.save')}</span>
            </button>
          </>
        )}
      >
        <p className={mutedBodyTextClass}>{t('settings.confirmSaveMessage')}</p>
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
              {t('common.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmPasswordChange}
              disabled={isChangingPassword}
              aria-busy={isChangingPassword}
              className={buttonClass}
            >
              <KeyRound className={defaultIconClass} />
              <span>{isChangingPassword ? t('settings.changingCredentials') : t('settings.changePassword')}</span>
            </button>
          </>
        )}
      >
        <p className={mutedBodyTextClass}>{t('settings.confirmPasswordChangeMessage')}</p>
      </Modal>

      <DeleteProfileConfirmModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeletingProfile}
        deletePassword={deletePassword}
        deletePasswordConfirm={deletePasswordConfirm}
        onDeletePasswordChange={onDeletePasswordChange}
        onDeletePasswordConfirmChange={onDeletePasswordConfirmChange}
        onClose={onCloseDeleteModal}
        onConfirm={onConfirmDeleteProfile}
      />
    </>
  );
});

SettingsActionModalsComponent.displayName = 'SettingsActionModals';

export const SettingsActionModals = SettingsActionModalsComponent;