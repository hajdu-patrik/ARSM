import { memo } from 'react';
import { Search, UserCheck, UserPlus } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';
import { filterNameInput, filterPhoneInput } from '../../../../utils/validation';
import type { LookupState, VehicleFormState, VehicleMode } from './SchedulerIntakeModal.types';

const FORM_FIELD_CLASS = 'w-full rounded-xl border border-arsm-border bg-white/80 px-3.5 py-2.5 text-sm text-arsm-primary placeholder-arsm-placeholder shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition duration-200 focus-visible:-translate-y-px focus-visible:border-arsm-accent focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:bg-arsm-input-dark/95 dark:text-arsm-primary-dark dark:placeholder-arsm-placeholder-dark dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:focus-visible:ring-arsm-focus-ring/24';
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
      <div className="relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-input/90 px-4 py-3 text-sm text-arsm-primary shadow-[0_10px_22px_rgba(45,36,64,0.08)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-primary-dark dark:shadow-[0_12px_24px_rgba(3,5,14,0.35)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-[linear-gradient(180deg,rgba(205,184,255,0.2)_0%,rgba(205,184,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(138,118,214,0.2)_0%,rgba(138,118,214,0)_100%)]" />
        <span className="relative font-medium">{t('scheduler.intake.selectedDay')}</span>
        <span className="relative ml-1">{selectedDayLabel}</span>
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

      <div className="rounded-2xl border border-arsm-border bg-arsm-input p-3.5 text-sm shadow-[0_8px_20px_rgba(45,36,64,0.07)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_10px_22px_rgba(3,5,14,0.3)]">
        <span className="font-medium text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.intake.statusLabel')}</span>
        <p className="mt-1 inline-flex rounded-full border border-arsm-warning-border/60 bg-arsm-warning-bg px-2.5 py-0.5 text-xs font-semibold text-arsm-warning-text dark:border-arsm-warning-border-dark/60 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark">
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
    <div className="relative space-y-3 overflow-hidden rounded-2xl border border-arsm-border bg-arsm-input p-3.5 shadow-[0_10px_24px_rgba(45,36,64,0.08)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_12px_26px_rgba(3,5,14,0.34)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-[linear-gradient(180deg,rgba(205,184,255,0.18)_0%,rgba(205,184,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(138,118,214,0.18)_0%,rgba(138,118,214,0)_100%)]" />
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
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-arsm-accent px-4 py-2.5 text-sm font-semibold text-arsm-primary shadow-[0_8px_18px_rgba(111,84,173,0.22)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_12px_24px_rgba(111,84,173,0.28)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_10px_20px_rgba(8,10,20,0.44)] dark:hover:bg-arsm-accent-dark-hover dark:hover:shadow-[0_12px_24px_rgba(8,10,20,0.52)]"
        >
          <Search className="h-4 w-4" />
          {isSearching ? t('scheduler.intake.searching') : t('scheduler.intake.search')}
        </button>
      </div>

      {lookupState === 'found' && customerLookup && (
        <div className="fade-in-up rounded-xl border border-arsm-success-border/60 bg-arsm-success-bg px-3.5 py-2.5 text-sm text-arsm-success-text shadow-[0_4px_12px_rgba(34,197,94,0.06)] dark:border-arsm-success-border-dark/60 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark">
          <div className="flex items-center gap-2 font-semibold">
            <UserCheck className="h-4 w-4" />
            {t('scheduler.intake.customerFound')}
          </div>
          <p className="mt-1">{customerLookup.firstName} {customerLookup.middleName ?? ''} {customerLookup.lastName}</p>
          <p className="text-xs opacity-80">{customerLookup.email}</p>
        </div>
      )}

      {lookupState === 'not-found' && (
        <div className="fade-in-up rounded-xl border border-arsm-warning-border/60 bg-arsm-warning-bg px-3.5 py-2.5 text-sm text-arsm-warning-text shadow-[0_4px_12px_rgba(245,158,11,0.06)] dark:border-arsm-warning-border-dark/60 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark">
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
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-arsm-border bg-arsm-input p-3.5 shadow-[0_10px_24px_rgba(45,36,64,0.07)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_12px_24px_rgba(3,5,14,0.3)] lg:grid-cols-2">
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
    <div className="space-y-3 rounded-2xl border border-arsm-border bg-arsm-input p-3.5 shadow-[0_10px_24px_rgba(45,36,64,0.07)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_12px_24px_rgba(3,5,14,0.3)]">
      {vehicleMode === 'existing' && (
        <p className="text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.intake.vehicleDetails')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onVehicleModeChange('existing')}
          disabled={!customerHasVehicles}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${vehicleMode === 'existing' ? 'border-arsm-accent/60 bg-arsm-accent text-arsm-primary shadow-[0_6px_14px_rgba(111,84,173,0.22)] dark:border-arsm-accent-dark/60 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_8px_16px_rgba(8,10,20,0.42)]' : 'border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/50 hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/50 dark:hover:bg-arsm-hover-dark'} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {t('scheduler.intake.useExistingVehicle')}
        </button>
        <button
          type="button"
          onClick={() => onVehicleModeChange('new')}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${vehicleMode === 'new' ? 'border-arsm-accent/60 bg-arsm-accent text-arsm-primary shadow-[0_6px_14px_rgba(111,84,173,0.22)] dark:border-arsm-accent-dark/60 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_8px_16px_rgba(8,10,20,0.42)]' : 'border-arsm-border bg-arsm-toggle-bg text-arsm-label hover:border-arsm-accent/50 hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:border-arsm-accent-dark/50 dark:hover:bg-arsm-hover-dark'}`}
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
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-arsm-border bg-arsm-input p-3.5 shadow-[0_10px_24px_rgba(45,36,64,0.07)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_12px_24px_rgba(3,5,14,0.3)] lg:grid-cols-2">
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
    <div className="space-y-3 rounded-2xl border border-arsm-border bg-arsm-input p-3.5 shadow-[0_10px_24px_rgba(45,36,64,0.07)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_12px_24px_rgba(3,5,14,0.3)]">
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
          className={`${FORM_TEXTAREA_CLASS} min-h-[7rem]`}
        />
      </label>
    </div>
  );
});
