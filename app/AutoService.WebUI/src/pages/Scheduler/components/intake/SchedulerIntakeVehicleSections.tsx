import { type ChangeEvent, memo, useMemo } from 'react';
import type { TFunction } from 'i18next';
import { Dropdown } from '../../../../components/common/Dropdown';
import { DRIVETRAIN_TYPES } from '../../../../types/customers/customers.types';
import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';
import {
  controlRowClass,
  formFieldGridClass,
  formFieldGroupClass,
  getTogglePillClass,
  insetSurfaceClass,
  intakeFieldLabelClass,
  intakeFieldWrapperClass,
  intakeInputClass,
  uppercaseMetaLabelTextClass,
} from '../../../../utils/formStyles';
import type { VehicleFormState, VehicleMode } from './SchedulerIntakeModal.types';

interface SchedulerIntakeVehicleModeProps {
  readonly customerLookup: SchedulerCustomerLookupDto | null;
  readonly customerHasVehicles: boolean;
  readonly vehicleMode: VehicleMode;
  readonly existingVehicleId: string;
  readonly translate: TFunction;
  readonly onVehicleModeChange: (mode: VehicleMode) => void;
  readonly onExistingVehicleIdChange: (value: string) => void;
}

/** Renders existing/new vehicle mode controls for scheduler intake. */
export const SchedulerIntakeVehicleModeSection = memo(function SchedulerIntakeVehicleModeSection({
  customerLookup,
  customerHasVehicles,
  vehicleMode,
  existingVehicleId,
  translate,
  onVehicleModeChange,
  onExistingVehicleIdChange,
}: SchedulerIntakeVehicleModeProps) {
  const vehicleOptions = useMemo(() => (customerLookup?.vehicles ?? []).map((vehicleItem) => ({
    value: String(vehicleItem.id),
    label: `${vehicleItem.licensePlate} - ${vehicleItem.brand} ${vehicleItem.model} (${String(vehicleItem.year)})`,
  })), [customerLookup]);

  return (
    <div className={`${insetSurfaceClass} space-y-3 p-3.5`}>
      {vehicleMode === 'existing' && <p className={uppercaseMetaLabelTextClass}>{translate('common.fields.vehicleDetails')}</p>}

      <div className={controlRowClass}>
        <button
          type="button"
          onClick={() => {
            onVehicleModeChange('existing');
          }}
          disabled={!customerHasVehicles}
          aria-pressed={vehicleMode === 'existing'}
          className={getTogglePillClass(vehicleMode === 'existing')}
        >
          {translate('scheduler.intake.useExistingVehicle')}
        </button>
        <button
          type="button"
          onClick={() => {
            onVehicleModeChange('new');
          }}
          aria-pressed={vehicleMode === 'new'}
          className={getTogglePillClass(vehicleMode === 'new')}
        >
          {translate('scheduler.intake.createNewVehicle')}
        </button>
      </div>

      {vehicleMode === 'existing' && (
        <label className={intakeFieldWrapperClass}>
          <span className={intakeFieldLabelClass}>{translate('scheduler.intake.selectVehicle')}</span>
          <div className={formFieldGroupClass}>
            <Dropdown
              size="intake"
              data-testid="scheduler-intake-existing-vehicle"
              value={existingVehicleId}
              options={vehicleOptions}
              onChange={onExistingVehicleIdChange}
              placeholder={translate('scheduler.intake.selectVehiclePlaceholder')}
            />
          </div>
        </label>
      )}
    </div>
  );
});

interface SchedulerIntakeVehicleFormProps {
  readonly vehicle: VehicleFormState;
  readonly translate: TFunction;
  readonly onVehicleFieldChange: (field: keyof VehicleFormState, value: string) => void;
}

/** Renders new-vehicle fields for scheduler intake. */
export const SchedulerIntakeVehicleForm = memo(function SchedulerIntakeVehicleForm({
  vehicle,
  translate,
  onVehicleFieldChange,
}: SchedulerIntakeVehicleFormProps) {
  const drivetrainOptions = useMemo(() => DRIVETRAIN_TYPES.map((type) => ({
    value: type,
    label: translate(`vehicle.drivetrain.${type}`),
  })), [translate]);

  /** Builds the change handler of one field; `uppercase` normalizes plate and VIN input. */
  const changeField = (field: keyof VehicleFormState, uppercase = false) => (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { value } = event.target;
    onVehicleFieldChange(field, uppercase ? value.toUpperCase() : value);
  };

  return (
    <div className={`${insetSurfaceClass} ${formFieldGridClass} p-3.5`}>
      <p className={`${uppercaseMetaLabelTextClass} sm:col-span-2`}>{translate('common.fields.vehicleDetails')}</p>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.licensePlate')}</span>
        <input value={vehicle.licensePlate} onChange={changeField('licensePlate', true)} placeholder={translate('common.placeholders.licensePlate')} className={`${intakeInputClass} uppercase`} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.vin')}</span>
        <input value={vehicle.vin} onChange={changeField('vin', true)} placeholder={translate('scheduler.intake.vehicleVinPlaceholder')} className={`${intakeInputClass} uppercase`} maxLength={17} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.brand')}</span>
        <input value={vehicle.brand} onChange={changeField('brand')} placeholder={translate('scheduler.intake.vehicleBrandPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.model')}</span>
        <input value={vehicle.model} onChange={changeField('model')} placeholder={translate('scheduler.intake.vehicleModelPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.vehicleYear')}</span>
        <input type="number" min={1886} max={2100} value={vehicle.year} onChange={changeField('year')} placeholder={translate('scheduler.intake.vehicleYearPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.mileageKm')}</span>
        <input type="number" min={0} max={5000000} value={vehicle.mileageKm} onChange={changeField('mileageKm')} placeholder={translate('scheduler.intake.vehicleMileageKmPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.enginePowerKw')}</span>
        <input type="number" min={0} max={50000} value={vehicle.enginePowerKw} onChange={changeField('enginePowerKw')} placeholder={translate('scheduler.intake.vehicleEnginePowerKwPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.drivetrain')}</span>
        <div className={formFieldGroupClass}>
          <Dropdown
            size="intake"
            value={vehicle.drivetrainType}
            options={drivetrainOptions}
            onChange={(value) => {
              onVehicleFieldChange('drivetrainType', value);
            }}
            placeholder={translate('common.placeholders.drivetrain')}
          />
        </div>
      </label>
    </div>
  );
});
