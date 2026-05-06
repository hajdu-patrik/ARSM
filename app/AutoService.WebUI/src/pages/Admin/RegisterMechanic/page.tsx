/**
 * Admin mechanic registration page.
 *
 * Combines mechanic list management and registration form submission
 * with inline validation and toast-based status feedback.
 * @module pages/Admin/RegisterMechanic/page
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { adminService } from '../../../services/admin/admin.service';
import { useToastStore } from '../../../store/toast.store';
import { buildRegisterMechanicRequest, canSubmitForm, emptyRegisterMechanicFormValues } from './helpers';
import { cardClass } from './constants';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { ProfessionalSection } from './sections/ProfessionalSection';
import { SecuritySection } from './sections/SecuritySection';
import { MechanicListSection } from './sections/MechanicListSection';
import { Modal } from '../../../components/common/Modal';
import { mapAdminValidationMessageToKey, normalizeServerFieldErrors } from '../../../utils/serverValidation';
import type { FieldErrors, RegisterMechanicFormValues } from './types';

const RegisterMechanicComponent = memo(function RegisterMechanicPage() {
  const { t } = useTranslation();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const [formValues, setFormValues] = useState<RegisterMechanicFormValues>(emptyRegisterMechanicFormValues);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegisterConfirmOpen, setIsRegisterConfirmOpen] = useState(false);
  const [pendingRegisterEmail, setPendingRegisterEmail] = useState('');
  const [mechanicListRefreshKey, setMechanicListRefreshKey] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = useCallback(
    <K extends keyof RegisterMechanicFormValues>(field: K, value: RegisterMechanicFormValues[K]) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const toggleExpertise = useCallback((value: string) => {
    setFormValues((prev) => ({
      ...prev,
      expertise: prev.expertise.includes(value)
        ? prev.expertise.filter((item) => item !== value)
        : [...prev.expertise, value],
    }));
  }, []);

  const canSubmit = useMemo(() => canSubmitForm(formValues, isSubmitting), [formValues, isSubmitting]);

  const handleToggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleToggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const handleFirstNameChange = useCallback((value: string) => {
    setFieldValue('firstName', value);
  }, [setFieldValue]);

  const handleMiddleNameChange = useCallback((value: string) => {
    setFieldValue('middleName', value);
  }, [setFieldValue]);

  const handleLastNameChange = useCallback((value: string) => {
    setFieldValue('lastName', value);
  }, [setFieldValue]);

  const handleEmailChange = useCallback((value: string) => {
    setFieldValue('email', value);
  }, [setFieldValue]);

  const handlePhoneNumberChange = useCallback((value: string) => {
    setFieldValue('phoneNumber', value);
  }, [setFieldValue]);

  const handlePasswordChange = useCallback((value: string) => {
    setFieldValue('password', value);
  }, [setFieldValue]);

  const handleConfirmPasswordChange = useCallback((value: string) => {
    setFieldValue('confirmPassword', value);
  }, [setFieldValue]);

  const handleSpecializationChange = useCallback((value: string) => {
    setFieldValue('specialization', value);
  }, [setFieldValue]);

  const resetForm = useCallback(() => {
    setFormValues(emptyRegisterMechanicFormValues());
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, []);

  const getFirstFieldErrorMessage = useCallback((errors: FieldErrors): string | null => {
    for (const values of Object.values(errors)) {
      if (values.length > 0) {
        return values[0];
      }
    }

    return null;
  }, []);

  /**
   * Handles API errors from the registration submission.
   * Shows inline field errors for 422/400 responses and falls back to toast messages
   * for authorization failures or unexpected errors.
   * @param err - The error thrown during registration request.
   */
  const handleSubmitError = useCallback((err: unknown) => {
    if (!isAxiosError<{ errors?: Record<string, string[]>; detail?: string }>(err)) {
      showErrorToast('admin.genericError');
      return;
    }

    if (err.response?.status === 422 || err.response?.status === 400) {
      const data = err.response.data;
      const normalizedFieldErrors = normalizeServerFieldErrors(data?.errors ?? {}, mapAdminValidationMessageToKey);

      if (Object.keys(normalizedFieldErrors).length > 0) {
        showErrorToast(getFirstFieldErrorMessage(normalizedFieldErrors) ?? 'admin.genericError');
        return;
      }

      showErrorToast('admin.genericError');
      return;
    }

    if (err.response?.status === 403) {
      showErrorToast('admin.forbidden');
      return;
    }

    showErrorToast('admin.genericError');
  }, [getFirstFieldErrorMessage, showErrorToast]);

  /**
   * Handles form submission: validates password confirmation, captures pending email,
   * and opens the registration confirmation modal.
   * @param e - The form submit event.
   */
  const handleSubmit = useCallback(
    (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (formValues.password !== formValues.confirmPassword) {
        showErrorToast('admin.passwordMismatch');
        return;
      }

      setPendingRegisterEmail(formValues.email.trim());
      setIsRegisterConfirmOpen(true);
    },
    [formValues, showErrorToast],
  );

  /**
   * Executes the mechanic registration API call after confirmation.
   * Resets the form and triggers a mechanic list refresh on success.
   */
  const handleRegisterConfirmed = useCallback(async () => {
    setIsRegisterConfirmOpen(false);
    setIsSubmitting(true);

    try {
      const request = buildRegisterMechanicRequest(formValues);
      const response = await adminService.registerMechanic(request);

      showSuccessToast('admin.successMessage', { email: response.email });
      resetForm();
      setMechanicListRefreshKey((k) => k + 1);
    } catch (err) {
      handleSubmitError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formValues, handleSubmitError, resetForm, showSuccessToast]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 max-[320px]:px-3 max-[320px]:py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="sr-only">{t('admin.pageTitle')}</h1>

        <div className="space-y-6">
        <div className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold text-arsm-primary dark:text-arsm-primary-dark">
            {t('admin.mechanicList')}
          </h2>
          <MechanicListSection refreshKey={mechanicListRefreshKey} />
        </div>

        <div className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold text-arsm-primary dark:text-arsm-primary-dark">
            {t('admin.registerMechanic')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <BasicInfoSection
              firstName={formValues.firstName}
              middleName={formValues.middleName}
              lastName={formValues.lastName}
              email={formValues.email}
              phoneNumber={formValues.phoneNumber}
              isSubmitting={isSubmitting}
              onFirstNameChange={handleFirstNameChange}
              onMiddleNameChange={handleMiddleNameChange}
              onLastNameChange={handleLastNameChange}
              onEmailChange={handleEmailChange}
              onPhoneNumberChange={handlePhoneNumberChange}
            />

            <SecuritySection
              password={formValues.password}
              confirmPassword={formValues.confirmPassword}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              isSubmitting={isSubmitting}
              onPasswordChange={handlePasswordChange}
              onConfirmPasswordChange={handleConfirmPasswordChange}
              onToggleShowPassword={handleToggleShowPassword}
              onToggleShowConfirmPassword={handleToggleShowConfirmPassword}
            />

            <ProfessionalSection
              specialization={formValues.specialization}
              expertise={formValues.expertise}
              isSubmitting={isSubmitting}
              onSpecializationChange={handleSpecializationChange}
              onToggleExpertise={toggleExpertise}
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-arsm-accent py-3 text-sm font-semibold text-arsm-primary transition hover:bg-arsm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-accent/40 disabled:cursor-not-allowed disabled:bg-arsm-accent-border dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:focus-visible:ring-arsm-accent-dark-hover/30 dark:disabled:bg-arsm-ring-dark sm:text-base"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? t('admin.submitting') : t('admin.submit')}
            </button>
          </form>
        </div>
        </div>
      </div>

      <Modal
        isOpen={isRegisterConfirmOpen}
        onClose={() => { if (!isSubmitting) setIsRegisterConfirmOpen(false); }}
        title={t('admin.confirmRegisterTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setIsRegisterConfirmOpen(false)}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void handleRegisterConfirmed(); }}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-4 py-2.5 text-sm font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover disabled:cursor-not-allowed disabled:bg-arsm-accent-border dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:disabled:bg-arsm-ring-dark"
            >
              {isSubmitting ? t('admin.submitting') : t('admin.confirmRegister')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">
          {t('admin.confirmRegisterMessage', { email: pendingRegisterEmail })}
        </p>
      </Modal>
    </div>
  );
});

RegisterMechanicComponent.displayName = 'RegisterMechanicPage';

/** Admin-only route component for mechanic management and registration. */
export const RegisterMechanicPage = RegisterMechanicComponent;
