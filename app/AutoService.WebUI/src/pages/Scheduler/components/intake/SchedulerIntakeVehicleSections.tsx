import { memo } from 'react';
import type { TFunction } from 'i18next';
import { DRIVETRAIN_TYPES } from '../../../../types/customers/customers.types';
import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';
import {
  controlRowClass,
  formFieldGridClass,
  getTogglePillClass,
  insetSurfaceClass,
  intakeFieldLabelClass,
  intakeFieldWrapperClass,
  intakeInputClass,
  selectWrapperClass,
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
  return (
    <div className={`${insetSurfaceClass} space-y-3 p-3.5`}>
      {vehicleMode === 'existing' && <p className={uppercaseMetaLabelTextClass}>{translate('scheduler.intake.vehicleDetails')}</p>}

      <div className={controlRowClass}>
        <button type="button" onClick={() => onVehicleModeChange('existing')} disabled={!customerHasVehicles} className={getTogglePillClass(vehicleMode === 'existing')}>
          {translate('scheduler.intake.useExistingVehicle')}
        </button>
        <button type="button" onClick={() => onVehicleModeChange('new')} className={getTogglePillClass(vehicleMode === 'new')}>
          {translate('scheduler.intake.createNewVehicle')}
        </button>
      </div>

      {vehicleMode === 'existing' && (
        <label className={intakeFieldWrapperClass}>
          <span className={intakeFieldLabelClass}>{translate('scheduler.intake.selectVehicle')}</span>
          <div className={selectWrapperClass}>
            <select
              data-testid="scheduler-intake-existing-vehicle"
              value={existingVehicleId}
              onChange={(event) => onExistingVehicleIdChange(event.target.value)}
              className={`${intakeInputClass} truncate`}
            >
              <option value="" disabled hidden>{translate('scheduler.intake.selectVehiclePlaceholder')}</option>
              {customerLookup?.vehicles.map((vehicleItem) => (
                <option key={vehicleItem.id} value={vehicleItem.id}>
                  {vehicleItem.licensePlate} - {vehicleItem.brand} {vehicleItem.model} ({vehicleItem.year})
                </option>
              ))}
            </select>
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
  return (
    <div className={`${insetSurfaceClass} ${formFieldGridClass} p-3.5`}>
      <p className={`${uppercaseMetaLabelTextClass} sm:col-span-2`}>{translate('scheduler.intake.vehicleDetails')}</p>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleLicensePlate')}</span>
        <input value={vehicle.licensePlate} onChange={(event) => onVehicleFieldChange('licensePlate', event.target.value.toUpperCase())} placeholder={translate('scheduler.intake.vehicleLicensePlatePlaceholder')} className={`${intakeInputClass} uppercase`} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleVin')}</span>
        <input value={vehicle.vin} onChange={(event) => onVehicleFieldChange('vin', event.target.value.toUpperCase())} placeholder={translate('scheduler.intake.vehicleVinPlaceholder')} className={`${intakeInputClass} uppercase`} maxLength={17} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleBrand')}</span>
        <input value={vehicle.brand} onChange={(event) => onVehicleFieldChange('brand', event.target.value)} placeholder={translate('scheduler.intake.vehicleBrandPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleModel')}</span>
        <input value={vehicle.model} onChange={(event) => onVehicleFieldChange('model', event.target.value)} placeholder={translate('scheduler.intake.vehicleModelPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleYear')}</span>
        <input type="number" min={1886} max={2100} value={vehicle.year} onChange={(event) => onVehicleFieldChange('year', event.target.value)} placeholder={translate('scheduler.intake.vehicleYearPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleMileageKm')}</span>
        <input type="number" min={0} max={5000000} value={vehicle.mileageKm} onChange={(event) => onVehicleFieldChange('mileageKm', event.target.value)} placeholder={translate('scheduler.intake.vehicleMileageKmPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleEnginePowerKw')}</span>
        <input type="number" min={0} max={50000} value={vehicle.enginePowerKw} onChange={(event) => onVehicleFieldChange('enginePowerKw', event.target.value)} placeholder={translate('scheduler.intake.vehicleEnginePowerKwPlaceholder')} className={intakeInputClass} />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleDrivetrainType')}</span>
        <div className={selectWrapperClass}>
          <select value={vehicle.drivetrainType} onChange={(event) => onVehicleFieldChange('drivetrainType', event.target.value)} className={`${intakeInputClass} truncate`}>
            <option value="" disabled hidden>{translate('scheduler.intake.vehicleDrivetrainPlaceholder')}</option>
            {DRIVETRAIN_TYPES.map((type) => (
              <option key={type} value={type}>{translate(`vehicle.drivetrain.${type}`)}</option>
            ))}
          </select>
        </div>
      </label>
    </div>
  );
});
