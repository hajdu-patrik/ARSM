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
import {
  extractDeleteProfileErrorKey,
  extractPasswordChangeErrors,
  extractProfileSaveErrors,
  fieldHasRequiredError,
} from './handlers';
import type { ProfileData } from '../../types/profile/profile.types';
import type { FieldErrors } from './types';
import { getAvatarInitials, getDeterministicAvatarColor } from '../../utils/avatar';
import { fileToImageSource } from '../../utils/imageCrop';
import { isAllowedPictureExtension } from '../../utils/validation';
import { emitProfilePictureUpdated } from '../../services/profile/profile-picture-live.service';

const MAX_PROFILE_PICTURE_BYTES = 512 * 1024;

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

  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureKey, setPictureKey] = useState(0);
  const [pictureSource, setPictureSource] = useState<string | null>(null);
  const [pendingPictureFileName, setPendingPictureFileName] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  const [isProfileSaveConfirmOpen, setIsProfileSaveConfirmOpen] = useState(false);
  const [isPasswordChangeConfirmOpen, setIsPasswordChangeConfirmOpen] = useState(false);
  const [isPictureRemoveConfirmOpen, setIsPictureRemoveConfirmOpen] = useState(false);

  const getFirstFieldErrorMessage = useCallback((errors: FieldErrors): string | null => {
    for (const values of Object.values(errors)) {
      if (values.length > 0) {
        return values[0];
      }
    }

    return null;
  }, []);

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
  }, [getFirstFieldErrorMessage, restoreRequiredProfileFields, showErrorToast]);

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
  }, [getFirstFieldErrorMessage, showErrorToast]);

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

  const handleSelectPicture = useCallback(async (file: File) => {
    if (!isAllowedPictureExtension(file.name)) {
      showErrorToast('toast.pictureInvalidType');
      return;
    }

    if (file.size > MAX_PROFILE_PICTURE_BYTES) {
      showErrorToast('toast.pictureTooLarge', { maxKb: Math.floor(MAX_PROFILE_PICTURE_BYTES / 1024) });
      return;
    }

    try {
      const imageSource = await fileToImageSource(file);
      setPendingPictureFileName(file.name);
      setPictureSource(imageSource);
    } catch {
      showErrorToast('toast.pictureCropFailed');
    }
  }, [showErrorToast]);

  const closePictureCropModal = useCallback(() => {
    setPictureSource(null);
    setPendingPictureFileName(null);
  }, []);

  const handleConfirmPictureCrop = useCallback(async (blob: Blob) => {
    if (!profile) {
      return;
    }

    setIsUploadingPicture(true);

    try {
      const finalFileName = pendingPictureFileName?.replace(/\.[^.]+$/, '') ?? 'profile-picture';
      const croppedFile = new File([blob], `${finalFileName}.png`, { type: blob.type || 'image/png' });

      await profileService.uploadProfilePicture(croppedFile);
      setProfile((prev) => prev ? { ...prev, hasProfilePicture: true } : prev);
      setPictureKey((previousKey) => previousKey + 1);
      closePictureCropModal();

      emitProfilePictureUpdated({ personId: profile.personId, hasProfilePicture: true });

      showSuccessToast('toast.pictureUploaded');
    } catch {
      showErrorToast('toast.pictureUploadFailed');
    } finally {
      setIsUploadingPicture(false);
    }
  }, [closePictureCropModal, pendingPictureFileName, profile, showErrorToast, showSuccessToast]);

  const handleRemovePicture = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsUploadingPicture(true);
    try {
      await profileService.deleteProfilePicture();
      setProfile((prev) => prev ? { ...prev, hasProfilePicture: false } : prev);
      setPictureKey((previousKey) => previousKey + 1);
      emitProfilePictureUpdated({ personId: profile.personId, hasProfilePicture: false });
      showSuccessToast('toast.pictureRemoved');
      setIsPictureRemoveConfirmOpen(false);
    } catch {
      showErrorToast('toast.pictureRemoveFailed');
    } finally {
      setIsUploadingPicture(false);
    }
  }, [profile, showErrorToast, showSuccessToast]);

  const handleRemovePictureRequest = useCallback(() => {
    if (!isUploadingPicture) {
      setIsPictureRemoveConfirmOpen(true);
    }
  }, [isUploadingPicture]);

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
    <section className="mx-auto w-full max-w-7xl px-4 py-6 max-[320px]:px-3 max-[320px]:py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-arsm-primary dark:text-arsm-primary-dark">
            {t('settings.title')}
          </h1>
        </header>

        <div className="space-y-6">
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
