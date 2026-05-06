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
import { isAxiosError } from 'axios';
import { profileService } from '../../services/profile/profile.service';
import { useToastStore } from '../../store/toast.store';
import { useAuthStore } from '../../store/auth.store';
import { ProfilePictureCropModal } from '../../components/common/ProfilePictureCropModal';
import { ProfilePictureSection } from './sections/ProfilePictureSection';
import { PersonalInfoSection } from './sections/PersonalInfoSection';
import { ChangePasswordSection } from './sections/ChangePasswordSection';
import { DeleteProfileSection } from './sections/DeleteProfileSection';
import { SettingsActionModals } from './SettingsActionModals';
import { extractFieldErrors } from './helpers';
import { hasFieldErrors, extractDeleteProfileErrorKey } from './handlers';
import type { ProfileData } from '../../types/profile/profile.types';
import type { FieldErrors } from './types';
import { getAvatarInitials, getDeterministicAvatarColor } from '../../utils/avatar';
import { fileToImageSource } from '../../utils/imageCrop';
import { mapSettingsValidationMessageToKey, normalizeServerFieldErrors } from '../../utils/serverValidation';
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

  // Profile data
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Personal info form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Picture
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureKey, setPictureKey] = useState(0);
  const [pictureSource, setPictureSource] = useState<string | null>(null);
  const [pendingPictureFileName, setPendingPictureFileName] = useState<string | null>(null);

  // Delete profile
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  // Confirmation modals
  const [isProfileSaveConfirmOpen, setIsProfileSaveConfirmOpen] = useState(false);
  const [isPasswordChangeConfirmOpen, setIsPasswordChangeConfirmOpen] = useState(false);

  const getFirstFieldErrorMessage = useCallback((errors: FieldErrors): string | null => {
    for (const values of Object.values(errors)) {
      if (values.length > 0) {
        return values[0];
      }
    }

    return null;
  }, []);

  // Load profile on mount
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

  /**
   * Executes the profile update API call after confirmation.
    * Syncs local form state with the returned profile on success and shows
    * a localized toast on failure.
   */
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
      if (isAxiosError<{ errors?: FieldErrors; detail?: string }>(err)) {
        const data = err.response?.data;
        const normalizedFieldErrors = normalizeServerFieldErrors(extractFieldErrors(data), mapSettingsValidationMessageToKey);

        if (hasFieldErrors(normalizedFieldErrors)) {
          showErrorToast(getFirstFieldErrorMessage(normalizedFieldErrors) ?? 'toast.profileUpdateFailed');
          return;
        }

        showErrorToast('toast.profileUpdateFailed');
      } else {
        showErrorToast('toast.profileUpdateFailed');
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [email, firstName, getFirstFieldErrorMessage, lastName, middleName, phoneNumber, showErrorToast, showSuccessToast]);

  const handleProfileSaveRequest = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsProfileSaveConfirmOpen(true);
  }, []);

  /**
   * Handles API errors from a password change request.
    * Maps server validation payloads to localized message keys and surfaces
    * a single toast message.
   * @param err - The error thrown during the password change call.
   */
  const handlePasswordChangeFailure = useCallback((err: unknown) => {
    if (isAxiosError<{ errors?: FieldErrors; detail?: string }>(err)) {
      const data = err.response?.data;
      const normalizedFieldErrors = normalizeServerFieldErrors(extractFieldErrors(data), mapSettingsValidationMessageToKey);

      if (hasFieldErrors(normalizedFieldErrors)) {
        showErrorToast(getFirstFieldErrorMessage(normalizedFieldErrors) ?? 'toast.passwordChangeFailed');
        return;
      }
    }

    showErrorToast('toast.passwordChangeFailed');
  }, [getFirstFieldErrorMessage, showErrorToast]);

  /**
   * Executes the password change API call after confirmation.
   * Clears password fields on success and delegates error display to
   * {@link handlePasswordChangeFailure}.
   */
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

  /**
   * Validates the password change form and opens the confirmation modal.
   * Sets inline errors for passwords that are too short or do not match.
   * @param e - The form submit event.
   */
  const handlePasswordChangeRequest = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();

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

  /**
   * Handles API errors from a profile delete request.
    * Maps the server error to a localized toast key when possible;
    * falls back to a generic delete-failed toast.
   * @param err - The error thrown during the profile delete call.
   */
  const handleDeleteProfileFailure = useCallback((err: unknown) => {
    const errorKey = extractDeleteProfileErrorKey(err);
    if (errorKey) {
      showErrorToast(errorKey);
      return;
    }
    showErrorToast('toast.profileDeleteFailed');
  }, [showErrorToast]);

  /**
   * Validates the selected picture file (extension and size), converts it to
   * a data-URL, and opens the crop modal.
   * @param file - The picture file selected by the user.
   */
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

  /**
   * Uploads the cropped picture blob to the server.
   * Updates local profile state and broadcasts a live-update event on success.
   * @param blob - The cropped image blob produced by the crop modal.
   */
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
      setPictureKey((k) => k + 1);
      closePictureCropModal();

      emitProfilePictureUpdated({ personId: profile.personId, hasProfilePicture: true });

      showSuccessToast('toast.pictureUploaded');
    } catch {
      showErrorToast('toast.pictureUploadFailed');
    } finally {
      setIsUploadingPicture(false);
    }
  }, [closePictureCropModal, pendingPictureFileName, profile, showErrorToast, showSuccessToast]);

  /**
   * Deletes the current user's profile picture from the server.
   * Updates local profile state and broadcasts a live-update event on success.
   */
  const handleRemovePicture = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsUploadingPicture(true);
    try {
      await profileService.deleteProfilePicture();
      setProfile((prev) => prev ? { ...prev, hasProfilePicture: false } : prev);
      setPictureKey((k) => k + 1);
      emitProfilePictureUpdated({ personId: profile.personId, hasProfilePicture: false });
      showSuccessToast('toast.pictureRemoved');
    } catch {
      showErrorToast('toast.pictureRemoveFailed');
    } finally {
      setIsUploadingPicture(false);
    }
  }, [profile, showErrorToast, showSuccessToast]);

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

  /**
   * Validates the current-password input, then deletes the user's profile.
   * Clears auth state, shows a success toast, and redirects to login on success.
   */
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 max-[320px]:px-3 max-[320px]:py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="sr-only">{t('settings.title')}</h1>

        <div className="space-y-6">
          <ProfilePictureSection
            hasProfilePicture={profile.hasProfilePicture}
            pictureUrl={profileService.getProfilePictureUrl()}
            initials={initials}
            fallbackColorClass={fallbackColorClass}
            pictureKey={pictureKey}
            isUploading={isUploadingPicture}
            onSelectFile={(file) => { void handleSelectPicture(file); }}
            onRemove={() => { void handleRemovePicture(); }}
          />

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

          <ChangePasswordSection
            usernameForAutocomplete={email}
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmNewPassword={confirmNewPassword}
            isSubmitting={isChangingPassword}
            onCurrentPasswordChange={setCurrentPassword}
            onNewPasswordChange={setNewPassword}
            onConfirmNewPasswordChange={setConfirmNewPassword}
            onSubmit={handlePasswordChangeRequest}
          />

          {!user?.isAdmin && (
            <DeleteProfileSection onDeleteRequest={openDeleteModal} />
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
    </div>
  );
});

SettingsPageComponent.displayName = 'SettingsPage';

/** Account settings route component for the authenticated user. */
export const SettingsPage = SettingsPageComponent;
