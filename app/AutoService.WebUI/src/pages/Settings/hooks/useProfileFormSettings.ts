/**
 * Profile form state and save workflow for Settings.
 * @module pages/Settings/hooks/useProfileFormSettings
 */

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { profileService } from '../../../services/profile/profile.service';
import { getFirstFieldErrorMessage } from '../../../utils/serverValidation';
import type { ProfileData } from '../../../types/profile/profile.types';
import { extractProfileSaveErrors, fieldHasRequiredError } from '../handlers';
import type { FieldErrors } from '../types';

interface UseProfileFormSettingsParams {
  readonly showSuccessToast: (message: string, options?: Record<string, string | number>) => void;
  readonly showErrorToast: (message: string, options?: Record<string, string | number>) => void;
}

/** Owns profile loading, edit state, validation recovery, and save confirmation flow. */
export function useProfileFormSettings({
  showSuccessToast,
  showErrorToast,
}: UseProfileFormSettingsParams) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isProfileSaveConfirmOpen, setIsProfileSaveConfirmOpen] = useState(false);

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
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [showErrorToast]);

  const hasProfileChanges = useMemo(() => {
    if (!profile) {
      return false;
    }

    return firstName !== profile.firstName
      || middleName !== (profile.middleName ?? '')
      || lastName !== profile.lastName
      || email !== profile.email
      || phoneNumber !== (profile.phoneNumber ?? '');
  }, [email, firstName, lastName, middleName, phoneNumber, profile]);

  const profileSaveDisabledReasonKey = useMemo(() => {
    if (isUpdatingProfile) {
      return 'settings.saving';
    }

    if (!hasProfileChanges) {
      return 'settings.saveRequiresChanges';
    }

    return null;
  }, [hasProfileChanges, isUpdatingProfile]);

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

  const handleProfileSaveRequest = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    if (isUpdatingProfile || !hasProfileChanges) {
      return;
    }

    setIsProfileSaveConfirmOpen(true);
  }, [hasProfileChanges, isUpdatingProfile]);

  const closeProfileSaveConfirm = useCallback(() => {
    if (!isUpdatingProfile) {
      setIsProfileSaveConfirmOpen(false);
    }
  }, [isUpdatingProfile]);

  return {
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
  };
}
