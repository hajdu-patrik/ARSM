/**
 * Settings page.
 *
 * Composes account settings sections while focused hooks own each mutation flow.
 * @module pages/Settings/page
 */

import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { profileService } from '../../services/profile/profile.service';
import { useToastStore } from '../../store/toast.store';
import { useAuthStore } from '../../store/auth.store';
import { ProfilePictureCropModal } from '../../components/common/ProfilePictureCropModal';
import { ProfilePictureSection } from './sections/ProfilePictureSection';
import { PersonalInfoSection } from './sections/PersonalInfoSection';
import { ChangePasswordSection } from './sections/ChangePasswordSection';
import { DeleteProfileSection } from './sections/DeleteProfileSection';
import { SettingsActionModals } from './SettingsActionModals';
import { loadingSpinnerClass, pageHeaderClass, pageShellClass, pageShellNarrowClass, pageTitleClass, sectionStackClass } from './constants';
import { getAvatarInitials, getDeterministicAvatarColor } from '../../utils/avatar';
import { useDeleteProfileSettings } from './hooks/useDeleteProfileSettings';
import { usePasswordChangeSettings } from './hooks/usePasswordChangeSettings';
import { useProfileFormSettings } from './hooks/useProfileFormSettings';
import { useProfilePictureSettings } from './hooks/useProfilePictureSettings';

const SettingsPageComponent = memo(function SettingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const profileForm = useProfileFormSettings({ showSuccessToast, showErrorToast });
  const passwordChange = usePasswordChangeSettings({ showSuccessToast, showErrorToast });
  const deleteProfile = useDeleteProfileSettings({ clearAuth, showSuccessToast, showErrorToast });

  const {
    profile,
    setProfile,
    isLoadingProfile,
    firstName,
    middleName,
    lastName,
    email,
    phoneNumber,
    isUpdatingProfile,
    hasProfileChanges,
    profileSaveDisabledReasonKey,
    isProfileSaveConfirmOpen,
    setFirstName,
    setMiddleName,
    setLastName,
    setEmail,
    setPhoneNumber,
    handleProfileSaveRequest,
    handleProfileSaveConfirmed,
    closeProfileSaveConfirm,
  } = profileForm;

  const {
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
  } = passwordChange;

  const {
    isDeleteModalOpen,
    isDeletingProfile,
    deletePassword,
    deletePasswordConfirm,
    setDeletePassword,
    setDeletePasswordConfirm,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteProfile,
  } = deleteProfile;

  const {
    isUploadingPicture,
    pictureKey,
    pictureSource,
    isPictureRemoveConfirmOpen,
    setIsPictureRemoveConfirmOpen,
    handleSelectPicture,
    closePictureCropModal,
    handleConfirmPictureCrop,
    handleRemovePicture,
    handleRemovePictureRequest,
  } = useProfilePictureSettings({
    profile,
    setProfile,
    showSuccessToast,
    showErrorToast,
  });

  const initials = useMemo(() => {
    if (!profile) return '';
    return getAvatarInitials(profile.firstName, profile.lastName, profile.email);
  }, [profile]);

  const fallbackColorClass = useMemo(() => {
    if (!profile) return getDeterministicAvatarColor('anonymous');
    return getDeterministicAvatarColor(profile.personId ?? profile.email);
  }, [profile]);

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className={`h-10 w-10 ${loadingSpinnerClass}`} />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <section className={pageShellClass}>
      <div className={pageShellNarrowClass}>
        <header className={pageHeaderClass}>
          <h1 className={pageTitleClass}>
            {t('settings.title')}
          </h1>
        </header>

        <div className={sectionStackClass}>
          <section aria-label={t('settings.profilePicture')}>
            <ProfilePictureSection
              hasProfilePicture={profile.hasProfilePicture}
              pictureUrl={profileService.getProfilePictureUrl()}
              initials={initials}
              fallbackColorClass={fallbackColorClass}
              pictureKey={pictureKey}
              isUploading={isUploadingPicture}
              onSelectFile={(file) => { void handleSelectPicture(file); }}
              onRemove={handleRemovePictureRequest}
            />
          </section>

          <section aria-label={t('settings.personalInfo')}>
            <PersonalInfoSection
              firstName={firstName}
              middleName={middleName}
              lastName={lastName}
              email={email}
              phoneNumber={phoneNumber}
              isSaveEnabled={hasProfileChanges}
              saveDisabledReasonKey={profileSaveDisabledReasonKey}
              isSubmitting={isUpdatingProfile}
              onFirstNameChange={setFirstName}
              onMiddleNameChange={setMiddleName}
              onLastNameChange={setLastName}
              onEmailChange={setEmail}
              onPhoneNumberChange={setPhoneNumber}
              onSubmit={handleProfileSaveRequest}
            />
          </section>

          <section aria-label={t('settings.changePassword')}>
            <ChangePasswordSection
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmNewPassword={confirmNewPassword}
              isSubmitting={isChangingPassword}
              onCurrentPasswordChange={setCurrentPassword}
              onNewPasswordChange={setNewPassword}
              onConfirmNewPasswordChange={setConfirmNewPassword}
              onSubmit={handlePasswordChangeRequest}
            />
          </section>

          {!user?.isAdmin && (
            <section aria-label={t('settings.deleteProfileTitle')}>
              <DeleteProfileSection onDeleteRequest={openDeleteModal} />
            </section>
          )}
        </div>
      </div>

      <ProfilePictureCropModal
        isOpen={Boolean(pictureSource)}
        imageSrc={pictureSource}
        isSubmitting={isUploadingPicture}
        onCancel={closePictureCropModal}
        onConfirm={handleConfirmPictureCrop}
      />

      <SettingsActionModals
        isPictureRemoveConfirmOpen={isPictureRemoveConfirmOpen}
        isUploadingPicture={isUploadingPicture}
        onClosePictureRemoveConfirm={() => { if (!isUploadingPicture) setIsPictureRemoveConfirmOpen(false); }}
        onConfirmPictureRemove={() => { void handleRemovePicture(); }}
        isProfileSaveConfirmOpen={isProfileSaveConfirmOpen}
        isUpdatingProfile={isUpdatingProfile}
        onCloseProfileSaveConfirm={closeProfileSaveConfirm}
        onConfirmProfileSave={() => { void handleProfileSaveConfirmed(); }}
        isPasswordChangeConfirmOpen={isPasswordChangeConfirmOpen}
        isChangingPassword={isChangingPassword}
        onClosePasswordChangeConfirm={closePasswordChangeConfirm}
        onConfirmPasswordChange={() => { handlePasswordChangeConfirmed().catch(() => undefined); }}
        isDeleteModalOpen={isDeleteModalOpen}
        isDeletingProfile={isDeletingProfile}
        deletePassword={deletePassword}
        deletePasswordConfirm={deletePasswordConfirm}
        onDeletePasswordChange={setDeletePassword}
        onDeletePasswordConfirmChange={setDeletePasswordConfirm}
        onCloseDeleteModal={closeDeleteModal}
        onConfirmDeleteProfile={() => { handleDeleteProfile().catch(() => undefined); }}
      />
    </section>
  );
});

SettingsPageComponent.displayName = 'SettingsPage';

/** Account settings route component for the authenticated user. */
export const SettingsPage = SettingsPageComponent;
