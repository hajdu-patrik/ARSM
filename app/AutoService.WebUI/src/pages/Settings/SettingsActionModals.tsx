/** Settings confirmation and delete modals. */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Save, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { DeleteProfileConfirmModal } from './DeleteProfileConfirmModal';
import { mutedBodyTextClass } from '../../utils/formStyles';

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
  readonly deletePasswordError: string | undefined;
  readonly onDeletePasswordChange: (value: string) => void;
  readonly onDeletePasswordConfirmChange: (value: string) => void;
  readonly onCloseDeleteModal: () => void;
  readonly onConfirmDeleteProfile: () => void;
}

/** The picture-remove, profile-save and password-change confirmations plus the delete-profile modal. */
export const SettingsActionModals = memo(function SettingsActionModals({
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
  deletePasswordError,
  onDeletePasswordChange,
  onDeletePasswordConfirmChange,
  onCloseDeleteModal,
  onConfirmDeleteProfile,
}: SettingsActionModalsProps) {
  const { t } = useTranslation();

  return (
    <>
      <ConfirmModal
        isOpen={isPictureRemoveConfirmOpen}
        title={t('settings.confirmPictureRemoveTitle')}
        isBusy={isUploadingPicture}
        onClose={onClosePictureRemoveConfirm}
        onConfirm={onConfirmPictureRemove}
        confirmLabel={t('settings.confirmPictureRemove')}
        busyLabel={t('settings.uploading')}
        icon={Trash2}
        tone="danger"
      >
        <p className={mutedBodyTextClass}>{t('settings.confirmPictureRemoveMessage')}</p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={isProfileSaveConfirmOpen}
        title={t('settings.confirmSaveTitle')}
        isBusy={isUpdatingProfile}
        onClose={onCloseProfileSaveConfirm}
        onConfirm={onConfirmProfileSave}
        confirmLabel={t('common.actions.save')}
        busyLabel={t('common.actions.saving')}
        icon={Save}
      >
        <p className={mutedBodyTextClass}>{t('settings.confirmSaveMessage')}</p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={isPasswordChangeConfirmOpen}
        title={t('settings.confirmPasswordChangeTitle')}
        isBusy={isChangingPassword}
        onClose={onClosePasswordChangeConfirm}
        onConfirm={onConfirmPasswordChange}
        confirmLabel={t('settings.changePassword')}
        busyLabel={t('settings.changingCredentials')}
        icon={KeyRound}
      >
        <p className={mutedBodyTextClass}>{t('settings.confirmPasswordChangeMessage')}</p>
      </ConfirmModal>

      <DeleteProfileConfirmModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeletingProfile}
        deletePassword={deletePassword}
        deletePasswordConfirm={deletePasswordConfirm}
        deletePasswordError={deletePasswordError}
        onDeletePasswordChange={onDeletePasswordChange}
        onDeletePasswordConfirmChange={onDeletePasswordConfirmChange}
        onClose={onCloseDeleteModal}
        onConfirm={onConfirmDeleteProfile}
      />
    </>
  );
});

