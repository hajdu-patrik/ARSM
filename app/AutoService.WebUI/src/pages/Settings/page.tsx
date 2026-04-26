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
  const inlineErrorTtlMs = 5000;

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

  const normalizeFieldErrors = useCallback((errors: FieldErrors): FieldErrors => {
    return normalizeServerFieldErrors(errors, mapSettingsValidationMessageToKey);
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
        if (!cancelled) setLoadErrorKey('settings.loadError');
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (Object.keys(profileFieldErrors).length === 0) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setProfileFieldErrors({});
    }, inlineErrorTtlMs);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [inlineErrorTtlMs, profileFieldErrors]);

  useEffect(() => {
    if (Object.keys(passwordFieldErrors).length === 0) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setPasswordFieldErrors({});
    }, inlineErrorTtlMs);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [inlineErrorTtlMs, passwordFieldErrors]);

  useEffect(() => {
    if (!deletePasswordError) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setDeletePasswordError(null);
    }, inlineErrorTtlMs);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [deletePasswordError, inlineErrorTtlMs]);

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

  const handleProfileSubmit = useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault();
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
        const status = err.response?.status;
        if ((status === 422 || status === 400) && data) {
          const fieldErrs = extractFieldErrors(data);
          if (Object.keys(fieldErrs).length > 0) {
            setProfileFieldErrors(normalizeFieldErrors(fieldErrs));
          }
          else showErrorToast('toast.profileUpdateFailed');
        } else {
          showErrorToast('toast.profileUpdateFailed');
        }
      } else {
        showErrorToast('toast.profileUpdateFailed');
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [email, firstName, lastName, middleName, normalizeFieldErrors, phoneNumber, showErrorToast, showSuccessToast]);

  const mapPasswordErrors = useCallback((errors: FieldErrors): FieldErrors => {
    const mapped: FieldErrors = {};

    Object.entries(errors).forEach(([key, value]) => {
      const normalizedValues = value.map((message) => mapSettingsValidationMessageToKey(message));

      if (key === 'CurrentPassword' || key === 'PasswordMismatch') {
        mapped.CurrentPassword = [...(mapped.CurrentPassword ?? []), ...normalizedValues];
      } else if (key === 'ConfirmNewPassword') {
        mapped.ConfirmNewPassword = [...(mapped.ConfirmNewPassword ?? []), ...normalizedValues];
      } else if (key === 'NewPassword') {
        mapped.NewPassword = [...(mapped.NewPassword ?? []), ...normalizedValues];
      } else {
        mapped.NewPassword = [...(mapped.NewPassword ?? []), ...normalizedValues];
      }
    });

    return mapped;
  }, []);

  const handlePasswordChangeFailure = useCallback((err: unknown) => {
    if (!isAxiosError<{ errors?: FieldErrors; detail?: string }>(err)) {
      showErrorToast('toast.passwordChangeFailed');
      return;
    }

    const data = err.response?.data;
    const status = err.response?.status;
    if ((status === 422 || status === 400) && data) {
      const fieldErrs = mapPasswordErrors(extractFieldErrors(data));
      if (Object.keys(fieldErrs).length > 0) {
        setPasswordFieldErrors(fieldErrs);
        return;
      }
    }

    showErrorToast('toast.passwordChangeFailed');
  }, [mapPasswordErrors, showErrorToast]);

  const handlePasswordSubmit = useCallback(async (e: React.SyntheticEvent) => {
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

  const handleDeleteProfileFailure = useCallback((err: unknown) => {
    if (!isAxiosError<{ errors?: FieldErrors; detail?: string }>(err)) {
      showErrorToast('toast.profileDeleteFailed');
      return;
    }

    const data = err.response?.data;
    const status = err.response?.status;
    if ((status === 422 || status === 400) && data?.errors) {
      const currentPasswordErrors = data.errors.CurrentPassword ?? data.errors.currentPassword;
      if (currentPasswordErrors && currentPasswordErrors.length > 0) {
        setDeletePasswordError(mapSettingsValidationMessageToKey(currentPasswordErrors[0]));
        return;
      }
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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-arsm-accent border-t-transparent" />
      </div>
    );
  }

  if (loadErrorKey || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <FormErrorMessage message={loadErrorKey ?? 'settings.loadError'} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
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
          onSubmit={(e) => { void handleProfileSubmit(e); }}
          getFieldError={getProfileFieldError}
          successMessage={null}
        />

        <ChangePasswordSection
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmNewPassword={confirmNewPassword}
          isSubmitting={isChangingPassword}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmNewPasswordChange={setConfirmNewPassword}
          onSubmit={(e) => { void handlePasswordSubmit(e); }}
          getFieldError={getPasswordFieldError}
          successMessage={null}
        />

        {!user?.isAdmin && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-900/20 sm:p-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">{t('settings.deleteProfileTitle')}</h2>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300/90">{t('settings.deleteProfileDescription')}</p>
            <button
              type="button"
              onClick={openDeleteModal}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-red-300 bg-transparent px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              {t('settings.deleteProfileButton')}
            </button>
          </div>
        )}
      </div>

      <ProfilePictureCropModal
        isOpen={Boolean(pictureSource)}
        imageSrc={pictureSource}
        isSubmitting={isUploadingPicture}
        onCancel={closePictureCropModal}
        onConfirm={handleConfirmPictureCrop}
      />

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
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
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
