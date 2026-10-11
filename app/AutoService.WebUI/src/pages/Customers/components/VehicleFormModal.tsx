import { memo, useId } from 'react';
import type { TFunction } from 'i18next';
import { Save } from 'lucide-react';
import { FieldErrorText } from '../../../components/common/FieldErrorText';
import { Modal } from '../../../components/common/Modal';
import { DRIVETRAIN_TYPES } from '../../../types/customers/customers.types';
import { fieldErrorA11yProps } from '../../../utils/fieldA11y';
import {
  buttonClass,
  defaultIconClass,
  formFieldGridClass,
  formFieldGroupClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
  selectWrapperClass,
} from '../../../utils/formStyles';
import type { FieldErrorKeys, VehicleFieldName } from '../fieldErrors';
import { isDrivetrainType, type VehicleFormState } from '../helpers';
import type { VehicleModalMode } from '../page.types';

interface VehicleFormModalProps {
  isOpen: boolean;
  mode: VehicleModalMode;
  isSaving: boolean;
  isSaveEnabled: boolean;
  form: VehicleFormState;
  fieldErrors: FieldErrorKeys<VehicleFieldName>;
  t: TFunction;
  onClose: () => void;
  onSubmit: (event: React.SyntheticEvent) => void;
  setForm: React.Dispatch<React.SetStateAction<VehicleFormState>>;
}

/** Vehicle create/edit modal: identity, numeric and drivetrain fields with inline per-field validation errors. */
const VehicleFormModalComponent = memo(function VehicleFormModal({
  isOpen,
  mode,
  isSaving,
  isSaveEnabled,
  form,
  fieldErrors,
  t,
  onClose,
  onSubmit,
  setForm,
}: VehicleFormModalProps) {
  const errorIdPrefix = useId();
  const errorId = (field: VehicleFieldName) => `${errorIdPrefix}-${field}-error`;

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
            {t('common.actions.cancel')}
          </button>
          <button
            type="submit"
            form="customers-vehicle-form"
            disabled={isSaving || !isSaveEnabled}
            aria-busy={isSaving}
            className={buttonClass}
          >
            <Save className={defaultIconClass} />
            <span>{isSaving ? t('common.actions.saving') : t('common.actions.save')}</span>
          </button>
        </>
      )}
    >
      <form id="customers-vehicle-form" onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className={`${formFieldGridClass} lg:grid-cols-3`}>
          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-license-plate" className={labelClass}>{t('common.fields.licensePlate')}</label>
            <input
              id="vehicle-license-plate"
              type="text"
              value={form.licensePlate}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, licensePlate: event.target.value }));
              }}
              className={inputClass}
              placeholder={t('common.placeholders.licensePlate')}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('licensePlate'), fieldErrors.licensePlate)}
            />
            <FieldErrorText id={errorId('licensePlate')} messageKey={fieldErrors.licensePlate} />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-vin" className={labelClass}>{t('common.fields.vin')}</label>
            <input
              id="vehicle-vin"
              type="text"
              value={form.vin}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, vin: event.target.value.toUpperCase() }));
              }}
              className={`${inputClass} uppercase`}
              placeholder={t('customers.vinPlaceholder')}
              maxLength={17}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('vin'), fieldErrors.vin)}
            />
            <FieldErrorText id={errorId('vin')} messageKey={fieldErrors.vin} />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-brand" className={labelClass}>{t('common.fields.brand')}</label>
            <input
              id="vehicle-brand"
              type="text"
              value={form.brand}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, brand: event.target.value }));
              }}
              className={inputClass}
              placeholder={t('customers.brandPlaceholder')}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('brand'), fieldErrors.brand)}
            />
            <FieldErrorText id={errorId('brand')} messageKey={fieldErrors.brand} />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-model" className={labelClass}>{t('common.fields.model')}</label>
            <input
              id="vehicle-model"
              type="text"
              value={form.model}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, model: event.target.value }));
              }}
              className={inputClass}
              placeholder={t('customers.modelPlaceholder')}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('model'), fieldErrors.model)}
            />
            <FieldErrorText id={errorId('model')} messageKey={fieldErrors.model} />
          </div>
        </div>

        <div className={formFieldGridClass}>
          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-year" className={labelClass}>{t('common.fields.vehicleYear')}</label>
            <input
              id="vehicle-year"
              type="number"
              value={form.year}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, year: event.target.value }));
              }}
              className={inputClass}
              placeholder={t('customers.yearPlaceholder')}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('year'), fieldErrors.year)}
            />
            <FieldErrorText id={errorId('year')} messageKey={fieldErrors.year} />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-mileage" className={labelClass}>{t('common.fields.mileageKm')}</label>
            <input
              id="vehicle-mileage"
              type="number"
              value={form.mileageKm}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, mileageKm: event.target.value }));
              }}
              className={inputClass}
              placeholder={t('customers.mileagePlaceholder')}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('mileageKm'), fieldErrors.mileageKm)}
            />
            <FieldErrorText id={errorId('mileageKm')} messageKey={fieldErrors.mileageKm} />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-power" className={labelClass}>{t('common.fields.enginePowerKw')}</label>
            <input
              id="vehicle-power"
              type="number"
              value={form.enginePowerKw}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, enginePowerKw: event.target.value }));
              }}
              className={inputClass}
              placeholder={t('customers.enginePowerPlaceholder')}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('enginePowerKw'), fieldErrors.enginePowerKw)}
            />
            <FieldErrorText id={errorId('enginePowerKw')} messageKey={fieldErrors.enginePowerKw} />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="vehicle-drivetrain" className={labelClass}>{t('common.fields.drivetrain')}</label>
            <div className={selectWrapperClass}>
              <select
                id="vehicle-drivetrain"
                value={form.drivetrainType}
                onChange={(event) => {
                  const { value } = event.target;
                  setForm((prev) => ({ ...prev, drivetrainType: isDrivetrainType(value) ? value : '' }));
                }}
                className={`${inputClass} min-w-0 truncate`}
                disabled={isSaving}
                {...fieldErrorA11yProps(errorId('drivetrainType'), fieldErrors.drivetrainType)}
              >
                <option value="" disabled hidden>
                  {t('common.placeholders.drivetrain')}
                </option>
                {DRIVETRAIN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`vehicle.drivetrain.${type}`)}
                  </option>
                ))}
              </select>
            </div>
            <FieldErrorText id={errorId('drivetrainType')} messageKey={fieldErrors.drivetrainType} />
          </div>
        </div>
      </form>
    </Modal>
  );
});

VehicleFormModalComponent.displayName = 'VehicleFormModal';

export const VehicleFormModal = VehicleFormModalComponent;
