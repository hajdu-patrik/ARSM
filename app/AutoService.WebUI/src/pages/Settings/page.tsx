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
import { FormErrorMessage } from '../../components/common/FormErrorMessage';
import { Modal } from '../../components/common/Modal';
import { ProfilePictureCropModal } from '../../components/common/ProfilePictureCropModal';
import { ProfilePictureSection } from './sections/ProfilePictureSection';
import { PersonalInfoSection } from './sections/PersonalInfoSection';
import { ChangePasswordSection } from './sections/ChangePasswordSection';
import { getFieldError, extractFieldErrors } from './helpers';
import { hasFieldErrors, mapPasswordErrors, extractPasswordChangeErrors, extractDeleteProfileErrorKey } from './handlers';
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
  const [loadErrorKey, setLoadErrorKey] = useState<string | null>(null);

  // Personal info form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFieldErrors, setProfileFieldErrors] = useState<FieldErrors>({});

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<FieldErrors>({});

  // Picture
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureKey, setPictureKey] = useState(0);
  const [pictureSource, setPictureSource] = useState<string | null>(null);
  const [pendingPictureFileName, setPendingPictureFileName] = useState<string | null>(null);

  // Delete profile
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  // Confirmation modals
  const [isProfileSaveConfirmOpen, setIsProfileSaveConfirmOpen] = useState(false);
  const [isPasswordChangeConfirmOpen, setIsPasswordChangeConfirmOpen] = useState(false);

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
        if (!cancelled) setLoadErrorKey('settings.loadError');
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const initials = useMemo(() => {
    if (!profile) return '';
    return getAvatarInitials(profile.firstName, profile.lastName, profile.email);
  }, [profile]);

  const fallbackColorClass = useMemo(() => {
    if (!profile) return getDeterministicAvatarColor('anonymous');
    return getDeterministicAvatarColor(profile.personId ?? profile.email);
  }, [profile]);

  const getProfileFieldError = useCallback(
    (field: string) => getFieldError(profileFieldErrors, field),
    [profileFieldErrors],
  );

  const getPasswordFieldError = useCallback(
    (field: string) => getFieldError(passwordFieldErrors, field),
    [passwordFieldErrors],
  );

  /**
   * Executes the profile update API call after confirmation.
   * Syncs local form state with the returned profile on success and shows
   * inline field errors or a toast on failure.
   */
  const handleProfileSaveConfirmed = useCallback(async () => {
    setIsProfileSaveConfirmOpen(false);
    setProfileFieldErrors({});
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
          setProfileFieldErrors(normalizedFieldErrors);
          return;
        }

        showErrorToast('toast.profileUpdateFailed');
      } else {
        showErrorToast('toast.profileUpdateFailed');
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [email, firstName, lastName, middleName, phoneNumber, showErrorToast, showSuccessToast]);

  const handleProfileSaveRequest = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsProfileSaveConfirmOpen(true);
  }, []);

  /**
   * Handles API errors from a password change request.
   * Sets inline field errors for 422/400 responses; falls back to an error toast.
   * @param err - The error thrown during the password change call.
   */
  const handlePasswordChangeFailure = useCallback((err: unknown) => {
    const fieldErrors = extractPasswordChangeErrors(err);
    if (fieldErrors) {
      setPasswordFieldErrors(fieldErrors);
      return;
    }
    showErrorToast('toast.passwordChangeFailed');
  }, [showErrorToast]);

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
    setPasswordFieldErrors({});

    if (newPassword.length < 8) {
      setPasswordFieldErrors({ NewPassword: ['settings.passwordTooShort'] });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordFieldErrors({ ConfirmNewPassword: ['settings.passwordsDoNotMatch'] });
      return;
    }

    setIsPasswordChangeConfirmOpen(true);
  }, [newPassword, confirmNewPassword]);

  /**
   * Handles API errors from a profile delete request.
   * Shows an inline password error for current-password failures;
   * falls back to an error toast for all other cases.
   * @param err - The error thrown during the profile delete call.
   */
  const handleDeleteProfileFailure = useCallback((err: unknown) => {
    const errorKey = extractDeleteProfileErrorKey(err);
    if (errorKey) {
      setDeletePasswordError(errorKey);
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
    setDeletePasswordError(null);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeletingProfile) {
      return;
    }

    setIsDeleteModalOpen(false);
    setDeletePassword('');
    setDeletePasswordError(null);
  }, [isDeletingProfile]);

  /**
   * Validates the current-password input, then deletes the user's profile.
   * Clears auth state, shows a success toast, and redirects to login on success.
   */
  const handleDeleteProfile = useCallback(async () => {
    if (!deletePassword.trim()) {
      setDeletePasswordError('settings.currentPasswordRequired');
      return;
    }

    setDeletePasswordError(null);
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
  }, [clearAuth, closeDeleteModal, deletePassword, handleDeleteProfileFailure, navigate, showSuccessToast]);

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-arsm-accent/30 border-t-arsm-accent dark:border-arsm-accent-dark/30 dark:border-t-arsm-accent-dark" />
      </div>
    );
  }

  if (loadErrorKey || !profile) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 max-[320px]:px-3 max-[320px]:py-5 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-3xl">
          <FormErrorMessage message={loadErrorKey ?? 'settings.loadError'} />
        </div>
      </div>
    );
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
          getFieldError={getProfileFieldError}
          successMessage={null}
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
          getFieldError={getPasswordFieldError}
          successMessage={null}
        />

        {!user?.isAdmin && (
          <div className="relative overflow-hidden rounded-2xl border border-arsm-error-border-light bg-arsm-error-bg p-5 shadow-[0_8px_24px_rgba(170,44,53,0.06)] dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:shadow-[0_10px_28px_rgba(170,44,53,0.04)] sm:p-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-[linear-gradient(180deg,rgba(215,82,94,0.06)_0%,rgba(215,82,94,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(215,82,94,0.08)_0%,rgba(215,82,94,0)_100%)]" />
            <h2 className="text-lg font-semibold text-arsm-error-text dark:text-arsm-error-soft">{t('settings.deleteProfileTitle')}</h2>
            <p className="mt-2 text-sm text-arsm-error-hover dark:text-arsm-error-text-light/85">{t('settings.deleteProfileDescription')}</p>
            <button
              type="button"
              onClick={openDeleteModal}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-arsm-error-border bg-transparent px-5 py-2.5 text-sm font-semibold text-arsm-error-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-bg hover:shadow-[0_8px_20px_rgba(215,82,94,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-error-hover/40 dark:border-arsm-error-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark dark:hover:shadow-[0_8px_20px_rgba(215,82,94,0.08)]"
            >
              {t('settings.deleteProfileButton')}
            </button>
          </div>
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

      <Modal
        isOpen={isProfileSaveConfirmOpen}
        onClose={() => { if (!isUpdatingProfile) setIsProfileSaveConfirmOpen(false); }}
        title={t('settings.confirmSaveTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setIsProfileSaveConfirmOpen(false)}
              disabled={isUpdatingProfile}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void handleProfileSaveConfirmed(); }}
              disabled={isUpdatingProfile}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-4 py-2.5 text-sm font-semibold text-arsm-primary shadow-[0_8px_20px_rgba(111,84,173,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_12px_26px_rgba(111,84,173,0.3)] disabled:cursor-not-allowed disabled:bg-arsm-accent-border disabled:shadow-none dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:disabled:bg-arsm-ring-dark"
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
        onClose={() => { if (!isChangingPassword) setIsPasswordChangeConfirmOpen(false); }}
        title={t('settings.confirmPasswordChangeTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setIsPasswordChangeConfirmOpen(false)}
              disabled={isChangingPassword}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void handlePasswordChangeConfirmed(); }}
              disabled={isChangingPassword}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-4 py-2.5 text-sm font-semibold text-arsm-primary shadow-[0_8px_20px_rgba(111,84,173,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_12px_26px_rgba(111,84,173,0.3)] disabled:cursor-not-allowed disabled:bg-arsm-accent-border disabled:shadow-none dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:disabled:bg-arsm-ring-dark"
            >
              {isChangingPassword ? t('settings.changingPassword') : t('settings.confirmPasswordChange')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.confirmPasswordChangeMessage')}</p>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title={t('settings.deleteProfileModalTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={isDeletingProfile}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void handleDeleteProfile(); }}
              disabled={isDeletingProfile}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-error-accent px-4 py-2.5 text-sm font-semibold text-arsm-on-accent shadow-[0_8px_20px_rgba(215,82,94,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-active hover:shadow-[0_12px_26px_rgba(215,82,94,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none dark:text-arsm-on-accent-dark"
            >
              {isDeletingProfile ? t('settings.deletingProfile') : t('settings.confirmDeleteProfile')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('settings.deleteProfileWarning')}</p>

        <div className="mt-4">
          <label htmlFor="delete-profile-password" className="mb-1.5 block text-sm font-medium text-arsm-label dark:text-arsm-label-dark">
            {t('settings.currentPassword')}
          </label>
          <input
            id="delete-profile-password"
            type="password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            placeholder={t('settings.currentPasswordPlaceholder')}
            autoComplete="current-password"
            disabled={isDeletingProfile}
            className="w-full rounded-xl border border-arsm-border bg-arsm-input px-4 py-3 text-[15px] text-arsm-primary placeholder-arsm-placeholder outline-none transition focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-accent/40 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-accent/24"
          />
          <FormErrorMessage message={deletePasswordError} className="mt-2" />
        </div>
      </Modal>
    </div>
  );
});

SettingsPageComponent.displayName = 'SettingsPage';

/** Account settings route component for the authenticated user. */
export const SettingsPage = SettingsPageComponent;
