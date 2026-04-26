import { memo } from 'react';
import { Search, UserCheck, UserPlus } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';
import { filterNameInput, filterPhoneInput } from '../../../../utils/validation';
import type { LookupState, VehicleFormState, VehicleMode } from './SchedulerIntakeModal.types';

const FORM_FIELD_CLASS = 'rounded-lg border border-arsm-border bg-arsm-input px-3 py-2 text-sm text-arsm-primary outline-none transition focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-accent/40 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:focus-visible:border-arsm-accent dark:focus-visible:ring-arsm-accent/24';
const FORM_TEXTAREA_CLASS = `${FORM_FIELD_CLASS} resize-y`;

interface SchedulerIntakeHeaderProps {
  readonly selectedDayLabel: string;
  readonly dueDateTime: string;
  readonly t: TFunction;
  readonly onDueDateTimeChange: (value: string) => void;
}

export const SchedulerIntakeHeader = memo(function SchedulerIntakeHeader({
  selectedDayLabel,
  dueDateTime,
  t,
  onDueDateTimeChange,
}: SchedulerIntakeHeaderProps) {
  return (
    <>
      <div className="rounded-xl border border-arsm-border bg-arsm-toggle-bg px-3 py-2 text-sm text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.selectedDay')}</span> {selectedDayLabel}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
          <span className="font-medium">{t('scheduler.intake.dueDateTime')}</span>
          <input
            type="datetime-local"
            data-testid="scheduler-intake-due-datetime"
            value={dueDateTime}
            onChange={(event) => onDueDateTimeChange(event.target.value)}
            className={`intake-datetime-input ${FORM_FIELD_CLASS}`}
          />
        </label>
      </div>

      <div className="rounded-xl border border-arsm-border bg-arsm-input p-3 text-sm dark:border-arsm-border-dark dark:bg-arsm-card-dark">
        <span className="font-medium text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.intake.statusLabel')}</span>
        <p className="mt-1 inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
          {t('scheduler.status.inprogress')}
        </p>
      </div>
    </>
  );
});

interface SchedulerIntakeLookupProps {
  readonly lookupState: LookupState;
  readonly customerLookup: SchedulerCustomerLookupDto | null;
  readonly email: string;
  readonly isSearching: boolean;
  readonly t: TFunction;
  readonly onEmailChange: (value: string) => void;
  readonly onLookup: () => void;
}

export const SchedulerIntakeLookupSection = memo(function SchedulerIntakeLookupSection({
  lookupState,
  customerLookup,
  email,
  isSearching,
  t,
  onEmailChange,
  onLookup,
}: SchedulerIntakeLookupProps) {
  return (
    <div className="space-y-3 rounded-xl border border-arsm-border bg-arsm-input p-3 dark:border-arsm-border-dark dark:bg-arsm-card-dark">
      <p className="text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.intake.userDetails')}</p>
      <h3 className="text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">{t('scheduler.intake.customerLookup')}</h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
          <span className="font-medium">{t('scheduler.intake.customerEmail')}</span>
          <input
            type="email"
            data-testid="scheduler-intake-customer-email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder={t('scheduler.intake.customerEmailPlaceholder')}
            className={FORM_FIELD_CLASS}
          />
        </label>

        <button
          type="button"
          data-testid="scheduler-intake-search"
          onClick={onLookup}
          disabled={isSearching}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-arsm-accent px-4 py-2 text-sm font-semibold text-arsm-primary transition-colors hover:bg-arsm-accent-hover disabled:opacity-50 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
        >
          <Search className="h-4 w-4" />
          {isSearching ? t('scheduler.intake.searching') : t('scheduler.intake.search')}
        </button>
      </div>

      {lookupState === 'found' && customerLookup && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-200">
          <div className="flex items-center gap-2 font-semibold">
            <UserCheck className="h-4 w-4" />
            {t('scheduler.intake.customerFound')}
          </div>
          <p className="mt-1">{customerLookup.firstName} {customerLookup.middleName ?? ''} {customerLookup.lastName}</p>
          <p className="text-xs opacity-80">{customerLookup.email}</p>
        </div>
      )}

      {lookupState === 'not-found' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <UserPlus className="h-4 w-4" />
            {t('scheduler.intake.customerNotFound')}
          </div>
          <p className="mt-1 text-xs">{t('scheduler.intake.customerCreateHint')}</p>
        </div>
      )}
    </div>
  );
});

interface SchedulerIntakeCustomerFormProps {
  readonly customerFirstName: string;
  readonly customerMiddleName: string;
  readonly customerLastName: string;
  readonly customerPhone: string;
  readonly t: TFunction;
  readonly onCustomerFirstNameChange: (value: string) => void;
  readonly onCustomerMiddleNameChange: (value: string) => void;
  readonly onCustomerLastNameChange: (value: string) => void;
  readonly onCustomerPhoneChange: (value: string) => void;
}

export const SchedulerIntakeCustomerForm = memo(function SchedulerIntakeCustomerForm({
  customerFirstName,
  customerMiddleName,
  customerLastName,
  customerPhone,
  t,
  onCustomerFirstNameChange,
  onCustomerMiddleNameChange,
  onCustomerLastNameChange,
  onCustomerPhoneChange,
}: SchedulerIntakeCustomerFormProps) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-arsm-border bg-arsm-input p-3 dark:border-arsm-border-dark dark:bg-arsm-card-dark lg:grid-cols-2">
      <p className="text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark lg:col-span-2">{t('scheduler.intake.personalInformation')}</p>
      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.customerFirstName')}</span>
        <input
          value={customerFirstName}
          onChange={(event) => onCustomerFirstNameChange(filterNameInput(event.target.value))}
          placeholder={t('scheduler.intake.customerFirstNamePlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.customerMiddleNameOptional')}</span>
        <input
          value={customerMiddleName}
          onChange={(event) => onCustomerMiddleNameChange(filterNameInput(event.target.value))}
          placeholder={t('scheduler.intake.customerMiddleNamePlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.customerLastName')}</span>
        <input
          value={customerLastName}
          onChange={(event) => onCustomerLastNameChange(filterNameInput(event.target.value))}
          placeholder={t('scheduler.intake.customerLastNamePlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.customerPhoneOptional')}</span>
        <input
          value={customerPhone}
          onChange={(event) => onCustomerPhoneChange(filterPhoneInput(event.target.value))}
          placeholder={t('scheduler.intake.customerPhonePlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>
    </div>
  );
});

interface SchedulerIntakeVehicleModeProps {
  readonly customerLookup: SchedulerCustomerLookupDto | null;
  readonly customerHasVehicles: boolean;
  readonly vehicleMode: VehicleMode;
  readonly existingVehicleId: string;
  readonly t: TFunction;
  readonly onVehicleModeChange: (mode: VehicleMode) => void;
  readonly onExistingVehicleIdChange: (value: string) => void;
}

export const SchedulerIntakeVehicleModeSection = memo(function SchedulerIntakeVehicleModeSection({
  customerLookup,
  customerHasVehicles,
  vehicleMode,
  existingVehicleId,
  t,
  onVehicleModeChange,
  onExistingVehicleIdChange,
}: SchedulerIntakeVehicleModeProps) {
  return (
    <div className="space-y-3 rounded-xl border border-arsm-border bg-arsm-input p-3 dark:border-arsm-border-dark dark:bg-arsm-card-dark">
      {vehicleMode === 'existing' && (
        <p className="text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.intake.vehicleDetails')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onVehicleModeChange('existing')}
          disabled={!customerHasVehicles}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${vehicleMode === 'existing' ? 'bg-arsm-accent text-arsm-primary dark:bg-arsm-accent-dark dark:text-arsm-hover' : 'bg-arsm-toggle-bg text-arsm-label dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark'} disabled:opacity-50`}
        >
          {t('scheduler.intake.useExistingVehicle')}
        </button>
        <button
          type="button"
          onClick={() => onVehicleModeChange('new')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${vehicleMode === 'new' ? 'bg-arsm-accent text-arsm-primary dark:bg-arsm-accent-dark dark:text-arsm-hover' : 'bg-arsm-toggle-bg text-arsm-label dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark'}`}
        >
          {t('scheduler.intake.createNewVehicle')}
        </button>
      </div>

      {vehicleMode === 'existing' && (
        <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
          <span className="font-medium">{t('scheduler.intake.selectVehicle')}</span>
          <select
            data-testid="scheduler-intake-existing-vehicle"
            value={existingVehicleId}
            onChange={(event) => onExistingVehicleIdChange(event.target.value)}
            className={FORM_FIELD_CLASS}
          >
            <option value="" disabled hidden>
              {t('scheduler.intake.selectVehiclePlaceholder')}
            </option>
            {customerLookup?.vehicles.map((vehicleItem) => (
              <option key={vehicleItem.id} value={vehicleItem.id}>
                {vehicleItem.licensePlate} - {vehicleItem.brand} {vehicleItem.model} ({vehicleItem.year})
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
});

interface SchedulerIntakeVehicleFormProps {
  readonly vehicle: VehicleFormState;
  readonly t: TFunction;
  readonly onVehicleFieldChange: (field: keyof VehicleFormState, value: string) => void;
}

export const SchedulerIntakeVehicleForm = memo(function SchedulerIntakeVehicleForm({
  vehicle,
  t,
  onVehicleFieldChange,
}: SchedulerIntakeVehicleFormProps) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-arsm-border bg-arsm-input p-3 dark:border-arsm-border-dark dark:bg-arsm-card-dark lg:grid-cols-2">
      <p className="text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark lg:col-span-2">{t('scheduler.intake.vehicleDetails')}</p>
      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.vehicleLicensePlate')}</span>
        <input
          value={vehicle.licensePlate}
          onChange={(event) => onVehicleFieldChange('licensePlate', event.target.value.toUpperCase())}
          placeholder={t('scheduler.intake.vehicleLicensePlatePlaceholder')}
          className={`${FORM_FIELD_CLASS} uppercase`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.vehicleBrand')}</span>
        <input
          value={vehicle.brand}
          onChange={(event) => onVehicleFieldChange('brand', event.target.value)}
          placeholder={t('scheduler.intake.vehicleBrandPlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.vehicleModel')}</span>
        <input
          value={vehicle.model}
          onChange={(event) => onVehicleFieldChange('model', event.target.value)}
          placeholder={t('scheduler.intake.vehicleModelPlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.vehicleYear')}</span>
        <input
          type="number"
          min={1886}
          max={2100}
          value={vehicle.year}
          onChange={(event) => onVehicleFieldChange('year', event.target.value)}
          placeholder={t('scheduler.intake.vehicleYearPlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.vehicleMileageKm')}</span>
        <input
          type="number"
          min={0}
          max={1000000}
          value={vehicle.mileageKm}
          onChange={(event) => onVehicleFieldChange('mileageKm', event.target.value)}
          placeholder={t('scheduler.intake.vehicleMileageKmPlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.vehicleEnginePowerHp')}</span>
        <input
          type="number"
          min={0}
          max={50000}
          value={vehicle.enginePowerHp}
          onChange={(event) => onVehicleFieldChange('enginePowerHp', event.target.value)}
          placeholder={t('scheduler.intake.vehicleEnginePowerHpPlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.vehicleEngineTorqueNm')}</span>
        <input
          type="number"
          min={0}
          max={50000}
          value={vehicle.engineTorqueNm}
          onChange={(event) => onVehicleFieldChange('engineTorqueNm', event.target.value)}
          placeholder={t('scheduler.intake.vehicleEngineTorqueNmPlaceholder')}
          className={FORM_FIELD_CLASS}
        />
      </label>
    </div>
  );
});

interface SchedulerIntakeTaskSectionProps {
  readonly taskDescription: string;
  readonly t: TFunction;
  readonly onTaskDescriptionChange: (value: string) => void;
}

export const SchedulerIntakeTaskSection = memo(function SchedulerIntakeTaskSection({
  taskDescription,
  t,
  onTaskDescriptionChange,
}: SchedulerIntakeTaskSectionProps) {
  return (
    <div className="space-y-3 rounded-xl border border-arsm-border bg-arsm-input p-3 dark:border-arsm-border-dark dark:bg-arsm-card-dark">
      <p className="text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.intake.taskDetails')}</p>
      <label className="flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
        <span className="font-medium">{t('scheduler.intake.taskDescription')}</span>
        <textarea
          data-testid="scheduler-intake-task-description"
          value={taskDescription}
          onChange={(event) => onTaskDescriptionChange(event.target.value)}
          placeholder={t('scheduler.intake.taskDescriptionPlaceholder')}
          maxLength={200}
          rows={4}
          className={FORM_TEXTAREA_CLASS}
        />
      </label>
    </div>
  );
});
