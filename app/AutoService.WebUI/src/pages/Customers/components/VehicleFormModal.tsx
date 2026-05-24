import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Save } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { DRIVETRAIN_TYPES } from '../../../types/customers/customers.types';
import {
  buttonClass,
  formFieldGridClass,
  formFieldGroupClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
  selectWrapperClass,
} from '../../../utils/formStyles';
import type { VehicleFormState } from '../helpers';

type VehicleModalMode = 'create' | 'edit';

interface VehicleFormModalProps {
  isOpen: boolean;
  mode: VehicleModalMode;
  isSaving: boolean;
  isSaveEnabled: boolean;
  form: VehicleFormState;
  t: TFunction;
  onClose: () => void;
  onSubmit: (event: React.SyntheticEvent) => void;
  setForm: React.Dispatch<React.SetStateAction<VehicleFormState>>;
}

const VehicleFormModalComponent = memo(function VehicleFormModal({
  isOpen,
  mode,
  isSaving,
  isSaveEnabled,
  form,
  t,
  onClose,
  onSubmit,
  setForm,
}: VehicleFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? t('customers.createVehicle') : t('customers.editVehicle')}
      widthClassName="max-w-2xl"
      footerClassName="arsm-modal-footer-confirm"
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
            form="customers-vehicle-form"
            disabled={isSaving || !isSaveEnabled}
            className={buttonClass}
          >
            <Save className="h-4 w-4 shrink-0" />
            <span>{isSaving ? t('customers.saving') : t('customers.save')}</span>
          </button>
        </>
      )}
    >
      <form id="customers-vehicle-form" onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className={`${formFieldGridClass} lg:grid-cols-3`}>
          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-license-plate" className={labelClass}>{t('customers.licensePlate')}</label>
            <input
              id="vehicle-license-plate"
              type="text"
              value={form.licensePlate}
              onChange={(event) => setForm((prev) => ({ ...prev, licensePlate: event.target.value }))}
              className={inputClass}
              placeholder={t('customers.licensePlatePlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-vin" className={labelClass}>{t('customers.vin')}</label>
            <input
              id="vehicle-vin"
              type="text"
              value={form.vin}
              onChange={(event) => setForm((prev) => ({ ...prev, vin: event.target.value.toUpperCase() }))}
              className={`${inputClass} uppercase`}
              placeholder={t('customers.vinPlaceholder')}
              maxLength={17}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-brand" className={labelClass}>{t('customers.brand')}</label>
            <input
              id="vehicle-brand"
              type="text"
              value={form.brand}
              onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
              className={inputClass}
              placeholder={t('customers.brandPlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-model" className={labelClass}>{t('customers.model')}</label>
            <input
              id="vehicle-model"
              type="text"
              value={form.model}
              onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
              className={inputClass}
              placeholder={t('customers.modelPlaceholder')}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={formFieldGridClass}>
          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-year" className={labelClass}>{t('customers.year')}</label>
            <input
              id="vehicle-year"
              type="number"
              value={form.year}
              onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
              className={inputClass}
              placeholder={t('customers.yearPlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-mileage" className={labelClass}>{t('customers.mileageKm')}</label>
            <input
              id="vehicle-mileage"
              type="number"
              value={form.mileageKm}
              onChange={(event) => setForm((prev) => ({ ...prev, mileageKm: event.target.value }))}
              className={inputClass}
              placeholder={t('customers.mileagePlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-power" className={labelClass}>{t('customers.enginePowerKw')}</label>
            <input
              id="vehicle-power"
              type="number"
              value={form.enginePowerKw}
              onChange={(event) => setForm((prev) => ({ ...prev, enginePowerKw: event.target.value }))}
              className={inputClass}
              placeholder={t('customers.enginePowerPlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-drivetrain" className={labelClass}>{t('customers.drivetrainType')}</label>
            <div className={selectWrapperClass}>
              <select
                id="vehicle-drivetrain"
                value={form.drivetrainType}
                onChange={(event) => setForm((prev) => ({ ...prev, drivetrainType: event.target.value as VehicleFormState['drivetrainType'] }))}
                className={`${inputClass} min-w-0 truncate`}
                disabled={isSaving}
              >
                <option value="" disabled hidden>
                  {t('customers.drivetrainPlaceholder')}
                </option>
                {DRIVETRAIN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`vehicle.drivetrain.${type}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
});

VehicleFormModalComponent.displayName = 'VehicleFormModal';

export const VehicleFormModal = VehicleFormModalComponent;
