/**
 * Settings page.
 *
 * Manages profile loading and editing flows: personal info updates,
 * password change, profile picture crop/upload/remove, and profile delete.
 * @module pages/Settings/page
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { pageHeaderClass, pageShellClass, pageShellNarrowClass, pageTitleClass, sectionStackClass } from './constants';
import {
  extractDeleteProfileErrorKey,
  extractPasswordChangeErrors,
  extractProfileSaveErrors,
  fieldHasRequiredError,
} from './handlers';
import type { ProfileData } from '../../types/profile/profile.types';
import type { FieldErrors } from './types';
import { getFirstFieldErrorMessage } from '../../utils/serverValidation';
import { getAvatarInitials, getDeterministicAvatarColor } from '../../utils/avatar';
import { useProfilePictureSettings } from './hooks/useProfilePictureSettings';

const SettingsPageComponent = memo(function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  const [isProfileSaveConfirmOpen, setIsProfileSaveConfirmOpen] = useState(false);
  const [isPasswordChangeConfirmOpen, setIsPasswordChangeConfirmOpen] = useState(false);

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

  const restoreRequiredProfileFields = useCallback((errors: FieldErrors) => {
    if (!profile) {
      return;
    }

    if (!firstName.trim() && fieldHasRequiredError(errors, 'firstName')) {
      setFirstName(profile.firstName);
    }

    if (!lastName.trim() && fieldHasRequiredError(errors, 'lastName')) {
      setLastName(profile.lastName);
    }

    if (!email.trim() && fieldHasRequiredError(errors, 'email')) {
      setEmail(profile.email);
    }
  }, [email, firstName, lastName, profile]);

  const handleProfileSaveFailure = useCallback((err: unknown) => {
    const normalizedFieldErrors = extractProfileSaveErrors(err);
    if (normalizedFieldErrors) {
      restoreRequiredProfileFields(normalizedFieldErrors);
      showErrorToast(getFirstFieldErrorMessage(normalizedFieldErrors) ?? 'toast.profileUpdateFailed');
      return;
    }

    showErrorToast('toast.profileUpdateFailed');
  }, [restoreRequiredProfileFields, showErrorToast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await profileService.getProfile();
        if (!cancelled) {
          setProfile(data);
          setFirstName(data.firstName);
          setLastName(data.lastName);
          setMiddleName(data.middleName ?? '');
          setEmail(data.email);
          setPhoneNumber(data.phoneNumber ?? '');
        }
      } catch {
        if (!cancelled) {
          showErrorToast('settings.loadError');
        }
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [showErrorToast]);

  const initials = useMemo(() => {
    if (!profile) return '';
    return getAvatarInitials(profile.firstName, profile.lastName, profile.email);
  }, [profile]);

  const fallbackColorClass = useMemo(() => {
    if (!profile) return getDeterministicAvatarColor('anonymous');
    return getDeterministicAvatarColor(profile.personId ?? profile.email);
  }, [profile]);

  const handleProfileSaveConfirmed = useCallback(async () => {
    setIsProfileSaveConfirmOpen(false);
    setIsUpdatingProfile(true);

    try {
      const updated = await profileService.updateProfile({ firstName, lastName, email, phoneNumber, middleName });
      setProfile(updated);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setMiddleName(updated.middleName ?? '');
      setEmail(updated.email);
      setPhoneNumber(updated.phoneNumber ?? '');
      showSuccessToast('toast.profileUpdated');
    } catch (err) {
      handleProfileSaveFailure(err);
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [email, firstName, handleProfileSaveFailure, lastName, middleName, phoneNumber, showSuccessToast]);

  const handleProfileSaveRequest = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
    setIsProfileSaveConfirmOpen(true);
  }, []);

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
  }, [
    confirmNewPassword,
    currentPassword,
    handlePasswordChangeFailure,
    newPassword,
    showSuccessToast,
  ]);

  const handlePasswordChangeRequest = useCallback((event: React.SyntheticEvent) => {
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
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeletingProfile) {
      return;
    }

    setIsDeleteModalOpen(false);
    setDeletePassword('');
  }, [isDeletingProfile]);

  const handleDeleteProfile = useCallback(async () => {
    if (!deletePassword.trim()) {
      showErrorToast('settings.currentPasswordRequired');
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
  }, [clearAuth, closeDeleteModal, deletePassword, handleDeleteProfileFailure, navigate, showErrorToast, showSuccessToast]);

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-arsm-accent/30 border-t-arsm-accent dark:border-arsm-accent-dark/30 dark:border-t-arsm-accent-dark" />
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
        onCloseProfileSaveConfirm={() => { if (!isUpdatingProfile) setIsProfileSaveConfirmOpen(false); }}
        onConfirmProfileSave={() => { void handleProfileSaveConfirmed(); }}
        isPasswordChangeConfirmOpen={isPasswordChangeConfirmOpen}
        isChangingPassword={isChangingPassword}
        onClosePasswordChangeConfirm={() => { if (!isChangingPassword) setIsPasswordChangeConfirmOpen(false); }}
        onConfirmPasswordChange={() => { void handlePasswordChangeConfirmed(); }}
        isDeleteModalOpen={isDeleteModalOpen}
        isDeletingProfile={isDeletingProfile}
        deletePassword={deletePassword}
        onDeletePasswordChange={setDeletePassword}
        onCloseDeleteModal={closeDeleteModal}
        onConfirmDeleteProfile={() => { void handleDeleteProfile(); }}
      />
    </section>
  );
});

SettingsPageComponent.displayName = 'SettingsPage';

/** Account settings route component for the authenticated user. */
export const SettingsPage = SettingsPageComponent;
