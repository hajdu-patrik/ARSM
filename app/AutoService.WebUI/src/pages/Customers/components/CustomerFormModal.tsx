import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Modal } from '../../../components/common/Modal';
import { filterNameInput, filterPhoneInput } from '../../../utils/validation';
import { buttonClass, formFieldGridClass, formFieldGroupClass, inputClass, labelClass, secondaryButtonClass } from '../../../utils/formStyles';

type CustomerModalMode = 'create' | 'edit';

interface CustomerFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

interface CustomerFormModalProps {
  isOpen: boolean;
  mode: CustomerModalMode;
  isSaving: boolean;
  form: CustomerFormState;
  t: TFunction;
  onClose: () => void;
  onSubmit: (event: React.SyntheticEvent) => void;
  setForm: React.Dispatch<React.SetStateAction<CustomerFormState>>;
}

const CustomerFormModalComponent = memo(function CustomerFormModal({
  isOpen,
  mode,
  isSaving,
  form,
  t,
  onClose,
  onSubmit,
  setForm,
}: CustomerFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? t('customers.createCustomer') : t('customers.editCustomer')}
      widthClassName="max-w-2xl"
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={secondaryButtonClass}
          >
            {t('settings.cancel')}
          </button>
          <button
            type="submit"
            form="customers-customer-form"
            disabled={isSaving}
            className={buttonClass}
          >
            {isSaving ? t('customers.saving') : t('customers.save')}
          </button>
        </>
      )}
    >
      <form id="customers-customer-form" onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className={`${formFieldGridClass} lg:grid-cols-3`}>
          <div className={formFieldGroupClass}>
            <label htmlFor="customer-first-name" className={labelClass}>{t('customers.firstName')}</label>
            <input
              id="customer-first-name"
              type="text"
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: filterNameInput(event.target.value) }))}
              className={inputClass}
              placeholder={t('customers.firstNamePlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="customer-middle-name" className={labelClass}>{t('customers.middleName')}</label>
            <input
              id="customer-middle-name"
              type="text"
              value={form.middleName}
              onChange={(event) => setForm((prev) => ({ ...prev, middleName: filterNameInput(event.target.value) }))}
              className={inputClass}
              placeholder={t('customers.middleNamePlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="customer-last-name" className={labelClass}>{t('customers.lastName')}</label>
            <input
              id="customer-last-name"
              type="text"
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: filterNameInput(event.target.value) }))}
              className={inputClass}
              placeholder={t('customers.lastNamePlaceholder')}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={formFieldGroupClass}>
          <label htmlFor="customer-email" className={labelClass}>{t('customers.email')}</label>
          <input
            id="customer-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className={inputClass}
            placeholder={t('customers.emailPlaceholder')}
            disabled={isSaving}
          />
        </div>

        <div className={formFieldGroupClass}>
          <label htmlFor="customer-phone" className={labelClass}>{t('customers.phoneNumber')}</label>
          <input
            id="customer-phone"
            type="tel"
            value={form.phoneNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: filterPhoneInput(event.target.value) }))}
            className={inputClass}
            placeholder={t('customers.phonePlaceholder')}
            disabled={isSaving}
          />
        </div>
      </form>
    </Modal>
  );
});

CustomerFormModalComponent.displayName = 'CustomerFormModal';

export const CustomerFormModal = CustomerFormModalComponent;
