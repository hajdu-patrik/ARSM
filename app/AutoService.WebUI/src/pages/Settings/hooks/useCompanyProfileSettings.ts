/** Company data form state and save workflow for Settings: the letterhead read, the draft edits and the update mutation. */

import { useCallback, useState, type SyntheticEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useQueryReadFailureToast } from '../../../hooks/useReadFailureToast';
import { adminService } from '../../../services/admin/admin.service';
import { adminQueries } from '../../../services/queries/admin.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { CompanyProfileDto } from '../../../types/admin/companyProfile.types';
import {
  NO_COMPANY_FIELD_ERRORS,
  applyCompanyDraft,
  hasCompanyFieldChanges,
  toCompanyFieldValues,
  toCompanyProfileDto,
  type CompanyDraft,
  type CompanyFieldErrors,
  type CompanyFieldName,
} from '../companyProfileFields';
import {
  extractCompanySaveErrors,
  getFirstCompanyErrorKey,
  hasCompanyFieldErrors,
  validateCompanyValues,
} from '../companyProfileValidation';

interface UseCompanyProfileSettingsParams {
  readonly isEnabled: boolean;
  readonly showSuccessToast: (message: string) => void;
  readonly showErrorToast: (message: string) => void;
}

/** Message key of the reason the save button is disabled, or null while saving is possible. */
function getSaveDisabledReasonKey(isSaving: boolean, hasChanges: boolean): string | null {
  if (isSaving) {
    return 'common.actions.saving';
  }

  return hasChanges ? null : 'settings.company.saveRequiresChanges';
}

/** Owns the company profile read (admin only), the edit draft laid over it, per-field errors and the save confirmation. */
export function useCompanyProfileSettings({
  isEnabled,
  showSuccessToast,
  showErrorToast,
}: UseCompanyProfileSettingsParams) {
  const queryClient = useQueryClient();
  const authScope = useAuthQueryScope();
  const scope = isEnabled ? authScope : null;
  const queryOptions = adminQueries.companyProfile(scope);
  const { data, isError, isSuccess, isLoading, errorUpdatedAt } = useQuery(queryOptions);
  const [draft, setDraft] = useState<CompanyDraft>({});
  const [fieldErrors, setFieldErrors] = useState<CompanyFieldErrors>(NO_COMPANY_FIELD_ERRORS);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  const baseline = toCompanyFieldValues(data ?? null);
  const values = applyCompanyDraft(baseline, draft);
  const hasChanges = hasCompanyFieldChanges(baseline, values);

  useQueryReadFailureToast({ data, isError, isSuccess, errorUpdatedAt }, 'settings.company.loadError', showErrorToast);

  const handleSaveFailure = useCallback((error: unknown) => {
    const serverErrors = extractCompanySaveErrors(error);
    if (serverErrors === null) {
      showErrorToast('toast.companyProfileUpdateFailed');
      return;
    }

    setFieldErrors(serverErrors);
    showErrorToast(getFirstCompanyErrorKey(serverErrors) ?? 'toast.companyProfileUpdateFailed');
  }, [showErrorToast]);

  const { mutate: updateCompanyProfile, isPending: isSaving } = useMutation({
    mutationFn: (request: CompanyProfileDto) => adminService.updateCompanyProfile(request),
    onSuccess: (updated) => {
      queryClient.setQueryData<CompanyProfileDto>(queryOptions.queryKey, updated);
      setDraft({});
      setFieldErrors(NO_COMPANY_FIELD_ERRORS);
      showSuccessToast('toast.companyProfileUpdated');
    },
    onError: handleSaveFailure,
  });

  const setField = useCallback((field: CompanyFieldName, value: string) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  }, []);

  const handleSaveRequest = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    if (isSaving || !hasChanges) {
      return;
    }

    validateCompanyValues(values).then((errors) => {
      setFieldErrors(errors);
      if (!hasCompanyFieldErrors(errors)) {
        setIsSaveConfirmOpen(true);
      }
    }).catch(() => {
      showErrorToast('toast.companyProfileUpdateFailed');
    });
  }, [hasChanges, isSaving, showErrorToast, values]);

  const handleSaveConfirmed = useCallback(() => {
    setIsSaveConfirmOpen(false);
    updateCompanyProfile(toCompanyProfileDto(values));
  }, [updateCompanyProfile, values]);

  const closeSaveConfirm = useCallback(() => {
    if (!isSaving) {
      setIsSaveConfirmOpen(false);
    }
  }, [isSaving]);

  return {
    isLoading: isEnabled && isLoading,
    values,
    fieldErrors,
    isSaving,
    hasChanges,
    saveDisabledReasonKey: getSaveDisabledReasonKey(isSaving, hasChanges),
    isSaveConfirmOpen,
    setField,
    handleSaveRequest,
    handleSaveConfirmed,
    closeSaveConfirm,
  };
}
