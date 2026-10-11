/** Admin mechanic registration page: mechanic list management plus registration with inline validation and toast feedback. */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import {
  buttonClass,
  cardClass,
  defaultIconClass,
  mutedBodyTextClass,
  pageHeaderClass,
  pageShellClass,
  pageShellNarrowClass,
  pageTitleClass,
  secondaryButtonClass,
  sectionStackClass,
  sectionTitleClass,
} from '../../../utils/formStyles';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { ProfessionalSection } from './sections/ProfessionalSection';
import { SecuritySection } from './sections/SecuritySection';
import { MechanicListSection } from './sections/MechanicListSection';
import { Modal } from '../../../components/common/Modal';
import { useRegisterMechanicForm } from './useRegisterMechanicForm';

const RegisterMechanicComponent = memo(function RegisterMechanicPage() {
  const { t } = useTranslation();
  const {
    formValues,
    fieldErrors,
    showPassword,
    showConfirmPassword,
    isSubmitting,
    canSubmit,
    isRegisterConfirmOpen,
    pendingRegisterEmail,
    setFieldValue,
    toggleExpertise,
    toggleShowPassword,
    toggleShowConfirmPassword,
    handleSubmit,
    handleRegisterConfirmed,
    closeRegisterConfirm,
  } = useRegisterMechanicForm();

  return (
    <section className={pageShellClass}>
      <div className={pageShellNarrowClass}>
        <header className={pageHeaderClass}>
          <h1 className={pageTitleClass}>{t('admin.pageTitle')}</h1>
        </header>

        <div className={sectionStackClass}>
          <section className={cardClass} aria-label={t('admin.mechanicList')}>
            <h2 className={sectionTitleClass}>
              {t('admin.mechanicList')}
            </h2>
            <MechanicListSection />
          </section>

          <section className={cardClass} aria-label={t('admin.registerMechanic')}>
            <h2 className={sectionTitleClass}>
              {t('admin.registerMechanic')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <BasicInfoSection
                firstName={formValues.firstName}
                middleName={formValues.middleName}
                lastName={formValues.lastName}
                email={formValues.email}
                phoneNumber={formValues.phoneNumber}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                onFieldChange={setFieldValue}
              />

              <SecuritySection
                password={formValues.password}
                confirmPassword={formValues.confirmPassword}
                showPassword={showPassword}
                showConfirmPassword={showConfirmPassword}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                onFieldChange={setFieldValue}
                onToggleShowPassword={toggleShowPassword}
                onToggleShowConfirmPassword={toggleShowConfirmPassword}
              />

              <ProfessionalSection
                specialization={formValues.specialization}
                expertise={formValues.expertise}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                onFieldChange={setFieldValue}
                onToggleExpertise={toggleExpertise}
              />

              <button
                type="submit"
                disabled={!canSubmit}
                className={`mt-2 w-full ${buttonClass}`}
                aria-busy={isSubmitting}
              >
                <Save className={defaultIconClass} />
                <span>{isSubmitting ? t('admin.submitting') : t('admin.registerMechanic')}</span>
              </button>
            </form>
          </section>
        </div>
      </div>

      <Modal
        isOpen={isRegisterConfirmOpen}
        onClose={closeRegisterConfirm}
        title={t('admin.confirmRegisterTitle')}
        variant="confirm"
        footer={(
          <>
            <button
              type="button"
              onClick={closeRegisterConfirm}
              disabled={isSubmitting}
              className={secondaryButtonClass}
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={handleRegisterConfirmed}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className={buttonClass}
            >
              <Save className={defaultIconClass} />
              <span>{isSubmitting ? t('admin.submitting') : t('admin.confirmRegister')}</span>
            </button>
          </>
        )}
      >
        <p className={mutedBodyTextClass}>
          {t('admin.confirmRegisterMessage', { email: pendingRegisterEmail })}
        </p>
      </Modal>
    </section>
  );
});

RegisterMechanicComponent.displayName = 'RegisterMechanicPage';

/** Admin-only route component for mechanic management and registration. */
export const RegisterMechanicPage = RegisterMechanicComponent;
