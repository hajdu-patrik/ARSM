import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Modal } from '../../../components/common/Modal';
import { buttonClass, inputClass, labelClass } from '../../../utils/formStyles';
import type { VehicleFormState } from '../helpers';

type VehicleModalMode = 'create' | 'edit';

interface VehicleFormModalProps {
  isOpen: boolean;
  mode: VehicleModalMode;
  isSaving: boolean;
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
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
          >
            {t('settings.cancel')}
          </button>
          <button
            type="submit"
            form="customers-vehicle-form"
            disabled={isSaving}
            className={`inline-flex items-center justify-center ${buttonClass}`}
          >
            {isSaving ? t('customers.saving') : t('customers.save')}
          </button>
        </>
      )}
    >
      <form id="customers-vehicle-form" onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
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

          <div>
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

          <div>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
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

          <div>
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

          <div>
            <label htmlFor="vehicle-power" className={labelClass}>{t('customers.enginePowerHp')}</label>
            <input
              id="vehicle-power"
              type="number"
              value={form.enginePowerHp}
              onChange={(event) => setForm((prev) => ({ ...prev, enginePowerHp: event.target.value }))}
              className={inputClass}
              placeholder={t('customers.enginePowerPlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div>
            <label htmlFor="vehicle-torque" className={labelClass}>{t('customers.engineTorqueNm')}</label>
            <input
              id="vehicle-torque"
              type="number"
              value={form.engineTorqueNm}
              onChange={(event) => setForm((prev) => ({ ...prev, engineTorqueNm: event.target.value }))}
              className={inputClass}
              placeholder={t('customers.engineTorquePlaceholder')}
              disabled={isSaving}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
});

VehicleFormModalComponent.displayName = 'VehicleFormModal';

export const VehicleFormModal = VehicleFormModalComponent;
