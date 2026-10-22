/** Profile form state and save workflow for Settings: the profile read, the draft edits and the update mutation. */

import { useCallback, useState, type SyntheticEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useQueryReadFailureToast } from '../../../hooks/useReadFailureToast';
import { profileService } from '../../../services/profile/profile.service';
import { profileQueries } from '../../../services/queries/profile.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { UpdateProfileRequest } from '../../../types/profile/profile.types';
import { getFirstFieldErrorMessage, hasRequiredFieldError } from '../../../utils/serverValidation';
import { extractProfileSaveErrors } from '../handlers';
import {
  NO_PROFILE_FIELD_ERRORS,
  REQUIRED_PROFILE_FIELDS,
  applyProfileDraft,
  hasProfileFieldChanges,
  pickProfileFieldErrors,
  toProfileFieldValues,
  withoutDraftFields,
  type ProfileDraft,
  type ProfileFieldErrors,
  type ProfileFieldName,
} from '../profileFields';
import { useProfileCache } from './useProfileCache';

interface UseProfileFormSettingsParams {
  readonly showSuccessToast: (message: string, options?: Record<string, string | number>) => void;
  readonly showErrorToast: (message: string, options?: Record<string, string | number>) => void;
}

/** Message key of the reason the save button is disabled, or null while saving is possible. */
function getSaveDisabledReasonKey(isUpdatingProfile: boolean, hasProfileChanges: boolean): string | null {
  if (isUpdatingProfile) {
    return 'common.actions.saving';
  }

  return hasProfileChanges ? null : 'settings.saveRequiresChanges';
}

export function useProfileFormSettings({
  showSuccessToast,
  showErrorToast,
}: UseProfileFormSettingsParams) {
  const scope = useAuthQueryScope();
  const { storeProfile, invalidateRoster } = useProfileCache();
  const { data, isError, isSuccess, isLoading: isLoadingProfile, errorUpdatedAt } = useQuery(profileQueries.me(scope));
  const [draft, setDraft] = useState<ProfileDraft>({});
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>(NO_PROFILE_FIELD_ERRORS);
  const [isProfileSaveConfirmOpen, setIsProfileSaveConfirmOpen] = useState(false);

  const profile = data ?? null;
  const baseline = toProfileFieldValues(profile);
  const values = applyProfileDraft(baseline, draft);
  const hasProfileChanges = hasProfileFieldChanges(baseline, values);

  useQueryReadFailureToast({ data, isError, isSuccess, errorUpdatedAt }, 'settings.loadError', showErrorToast);

  const handleProfileSaveFailure = useCallback((error: unknown) => {
    const serverErrors = extractProfileSaveErrors(error);
    if (serverErrors === null) {
      showErrorToast('toast.profileUpdateFailed');
      return;
    }

    const restoredFields = REQUIRED_PROFILE_FIELDS.filter(
      (field) => values[field].trim() === '' && hasRequiredFieldError(serverErrors, field),
    );
    setDraft((previous) => withoutDraftFields(previous, restoredFields));
    setFieldErrors(pickProfileFieldErrors(serverErrors, restoredFields));
    showErrorToast(getFirstFieldErrorMessage(serverErrors) ?? 'toast.profileUpdateFailed');
  }, [showErrorToast, values]);

  const { mutate: updateProfile, isPending: isUpdatingProfile } = useMutation({
    mutationFn: (request: UpdateProfileRequest) => profileService.updateProfile(request),
    onSuccess: (updated) => {
      storeProfile(updated);
      invalidateRoster();
      setDraft({});
      setFieldErrors(NO_PROFILE_FIELD_ERRORS);
      showSuccessToast('toast.profileUpdated');
    },
    onError: handleProfileSaveFailure,
  });

  const setField = useCallback((field: ProfileFieldName, value: string) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  }, []);

  const handleProfileSaveRequest = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    if (isUpdatingProfile || !hasProfileChanges) {
      return;
    }

    setIsProfileSaveConfirmOpen(true);
  }, [hasProfileChanges, isUpdatingProfile]);

  const handleProfileSaveConfirmed = useCallback(() => {
    setIsProfileSaveConfirmOpen(false);
    updateProfile({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phoneNumber: values.phoneNumber,
      middleName: values.middleName,
    });
  }, [updateProfile, values]);

  const closeProfileSaveConfirm = useCallback(() => {
    if (!isUpdatingProfile) {
      setIsProfileSaveConfirmOpen(false);
    }
  }, [isUpdatingProfile]);

  return {
    profile,
    isLoadingProfile,
    values,
    fieldErrors,
    isUpdatingProfile,
    hasProfileChanges,
    profileSaveDisabledReasonKey: getSaveDisabledReasonKey(isUpdatingProfile, hasProfileChanges),
    isProfileSaveConfirmOpen,
    setField,
    handleProfileSaveRequest,
    handleProfileSaveConfirmed,
    closeProfileSaveConfirm,
  };
}
