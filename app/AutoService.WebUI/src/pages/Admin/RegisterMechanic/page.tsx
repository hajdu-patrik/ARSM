/**
 * Admin mechanic registration page.
 *
 * Combines mechanic list management and registration form submission
 * with inline validation and toast-based status feedback.
 * @module pages/Admin/RegisterMechanic/page
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { adminService } from '../../../services/admin/admin.service';
import { useToastStore } from '../../../store/toast.store';
import { buildRegisterMechanicRequest, canSubmitForm, emptyRegisterMechanicFormValues, getFieldError } from './helpers';
import { cardClass } from './constants';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { ProfessionalSection } from './sections/ProfessionalSection';
import { SecuritySection } from './sections/SecuritySection';
import { MechanicListSection } from './sections/MechanicListSection';
import { mapAdminValidationMessageToKey, normalizeServerFieldErrors } from '../../../utils/serverValidation';
import type { FieldErrors, RegisterMechanicFormValues } from './types';

const RegisterMechanicComponent = memo(function RegisterMechanicPage() {
  const { t } = useTranslation();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const [formValues, setFormValues] = useState<RegisterMechanicFormValues>(emptyRegisterMechanicFormValues);
  const [showPassword, setShowPassword] = useState(false);
  const [mechanicListRefreshKey, setMechanicListRefreshKey] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rawFieldErrors, setRawFieldErrors] = useState<FieldErrors>({});

  const normalizeFieldErrors = useCallback((errors: FieldErrors): FieldErrors => {
    return normalizeServerFieldErrors(errors, mapAdminValidationMessageToKey);
  }, []);

  const fieldErrors = useMemo(() => normalizeFieldErrors(rawFieldErrors), [normalizeFieldErrors, rawFieldErrors]);

  const pickInlineContactFieldErrors = useCallback((errors: FieldErrors): FieldErrors => {
    const emailErrors = errors.email ?? errors.Email;
    const phoneErrors = errors.phoneNumber ?? errors.PhoneNumber;

    const filtered: FieldErrors = {};
    if (emailErrors?.length) {
      filtered.email = emailErrors;
    }
    if (phoneErrors?.length) {
      filtered.phoneNumber = phoneErrors;
    }

    return filtered;
  }, []);

  useEffect(() => {
    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    if (!hasFieldErrors) return;

    const timeoutId = globalThis.setTimeout(() => {
      setRawFieldErrors({});
    }, 5000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [fieldErrors]);

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

  const getErrorForField = useCallback(
    (field: string) => getFieldError(fieldErrors, field),
    [fieldErrors],
  );

  const canSubmit = useMemo(() => canSubmitForm(formValues, isSubmitting), [formValues, isSubmitting]);

  const handleToggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
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

  const handleSpecializationChange = useCallback((value: string) => {
    setFieldValue('specialization', value);
  }, [setFieldValue]);

  const resetForm = useCallback(() => {
    setFormValues(emptyRegisterMechanicFormValues());
    setShowPassword(false);
    setRawFieldErrors({});
  }, []);

  const handleSubmitError = useCallback((err: unknown) => {
    if (!isAxiosError<{ errors?: Record<string, string[]>; detail?: string }>(err)) {
      showErrorToast('admin.genericError');
      return;
    }

    if (err.response?.status === 422 || err.response?.status === 400) {
      const data = err.response.data;
      const inlineErrors = data?.errors ? pickInlineContactFieldErrors(data.errors) : {};

      if (Object.keys(inlineErrors).length > 0) {
        setRawFieldErrors(inlineErrors);
        return;
      }

      // Keep validation feedback directly under relevant fields to avoid duplicate top-panel errors.
      showErrorToast('admin.validationError');
      return;
    }

    if (err.response?.status === 403) {
      showErrorToast('admin.forbidden');
      return;
    }

    showErrorToast('admin.genericError');
  }, [pickInlineContactFieldErrors, showErrorToast]);

  const handleSubmit = useCallback(
    async (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      setRawFieldErrors({});
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
    },
    [formValues, handleSubmitError, resetForm, showSuccessToast],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="sr-only">{t('admin.pageTitle')}</h1>

      <div className="space-y-6">
        <div className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold text-[#2C2440] dark:text-[#EDE8FA]">
            {t('admin.mechanicList')}
          </h2>
          <MechanicListSection refreshKey={mechanicListRefreshKey} />
        </div>

        <div className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold text-[#2C2440] dark:text-[#EDE8FA]">
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
              getFieldError={getErrorForField}
            />

            <SecuritySection
              password={formValues.password}
              showPassword={showPassword}
              isSubmitting={isSubmitting}
              onPasswordChange={handlePasswordChange}
              onToggleShowPassword={handleToggleShowPassword}
              getFieldError={getErrorForField}
            />

            <ProfessionalSection
              specialization={formValues.specialization}
              expertise={formValues.expertise}
              isSubmitting={isSubmitting}
              onSpecializationChange={handleSpecializationChange}
              onToggleExpertise={toggleExpertise}
              getFieldError={getErrorForField}
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#C9B3FF] py-3 text-sm font-semibold text-[#2C2440] shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition hover:bg-[#BFA6F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] disabled:cursor-not-allowed disabled:bg-[#DCCDFA] dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6] dark:focus-visible:ring-[#8A75D64D] dark:disabled:bg-[#4B406E] sm:text-base"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? t('admin.submitting') : t('admin.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
});

RegisterMechanicComponent.displayName = 'RegisterMechanicPage';

/** Admin-only route component for mechanic management and registration. */
export const RegisterMechanicPage = RegisterMechanicComponent;
