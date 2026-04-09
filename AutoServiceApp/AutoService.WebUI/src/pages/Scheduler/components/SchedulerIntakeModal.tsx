import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Search, UserCheck, UserPlus } from 'lucide-react';
import type {
  SchedulerCreateIntakeRequest,
  SchedulerCustomerLookupDto,
  SchedulerNewVehicleRequest,
} from '../../../types/scheduler.types';
import { appointmentService } from '../../../services/appointment.service';
import { FormErrorMessage } from '../../../components/common/FormErrorMessage';
import { Modal } from '../../../components/common/Modal';
import { buildSelectedDayIso, toDatetimeLocalValue } from './due-date';
import { filterNameInput, filterPhoneInput } from '../../../utils/validation';

interface SchedulerIntakeModalProps {
  readonly isOpen: boolean;
  readonly selectedDate: Date;
  readonly onClose: () => void;
  readonly onSubmit: (request: SchedulerCreateIntakeRequest) => Promise<void>;
}

type LookupState = 'idle' | 'found' | 'not-found';
type VehicleMode = 'existing' | 'new';

interface IntakeApiError {
  detail?: string;
}

interface VehicleFormState {
  licensePlate: string;
  brand: string;
  model: string;
  year: string;
  mileageKm: string;
  enginePowerHp: string;
  engineTorqueNm: string;
}

const EMPTY_VEHICLE: VehicleFormState = {
  licensePlate: '',
  brand: '',
  model: '',
  year: '',
  mileageKm: '0',
  enginePowerHp: '0',
  engineTorqueNm: '0',
};

function getDefaultScheduledDate(selectedDate: Date): string {
  const now = new Date();
  return toDatetimeLocalValue(
    buildSelectedDayIso(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      selectedDate.getDate(),
      now.getHours(),
      now.getMinutes(),
    ),
  );
}

function getDefaultDueDate(selectedDate: Date): string {
  const next = new Date(selectedDate);
  next.setDate(selectedDate.getDate() + 3);

  return toDatetimeLocalValue(
    buildSelectedDayIso(
      next.getFullYear(),
      next.getMonth() + 1,
      next.getDate(),
      17,
    ),
  );
}

function mapIntakeErrorToKey(error: unknown): string {
  const axiosError = error as AxiosError<IntakeApiError>;
  const detail = axiosError.response?.data?.detail?.toLowerCase() ?? '';

  if (detail.includes('invalid email')) return 'scheduler.intake.errors.invalidEmail';
  if (detail.includes('taskdescription is required')) return 'scheduler.intake.errors.taskRequired';
  if (detail.includes('duedatetime must be greater than or equal to scheduleddate')) return 'scheduler.intake.errors.dueBeforeScheduled';
  if (detail.includes('customerfirstname and customerlastname are required')) return 'scheduler.intake.errors.customerNameRequired';
  if (detail.includes('invalid first name') || detail.includes('invalid last name') || detail.includes('invalid middle name')) {
    return 'scheduler.intake.errors.invalidName';
  }
  if (detail.includes('phone number must be a valid hungarian number')) return 'scheduler.intake.errors.invalidPhone';
  if (detail.includes('vehicle.licenseplate, vehicle.brand, and vehicle.model are required')) {
    return 'scheduler.intake.errors.vehicleRequiredFields';
  }
  if (detail.includes('license plate')) return 'scheduler.intake.errors.licensePlateInvalid';
  if (detail.includes('vehicle.year must be between 1886 and 2100')) return 'scheduler.intake.errors.vehicleYearInvalid';
  if (detail.includes('must be non-negative')) return 'scheduler.intake.errors.vehicleNumberInvalid';
  if (detail.includes('scheduleddate cannot be in the past')) return 'scheduler.intake.errors.scheduledInPast';
  if (detail.includes('already exists')) return 'scheduler.intake.errors.conflictData';
  if (detail.includes('unable to create intake')) return 'scheduler.intake.errors.conflictData';

  return 'scheduler.intake.errors.createFailed';
}

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function buildVehiclePayload(vehicle: VehicleFormState): SchedulerNewVehicleRequest {
  return {
    licensePlate: vehicle.licensePlate.trim(),
    brand: vehicle.brand.trim(),
    model: vehicle.model.trim(),
    year: Number(vehicle.year),
    mileageKm: Number(vehicle.mileageKm),
    enginePowerHp: Number(vehicle.enginePowerHp),
    engineTorqueNm: Number(vehicle.engineTorqueNm),
  };
}

const SchedulerIntakeModalComponent = memo(function SchedulerIntakeModal({
  isOpen,
  selectedDate,
  onClose,
  onSubmit,
}: SchedulerIntakeModalProps) {
  const { t, i18n } = useTranslation();
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [customerLookup, setCustomerLookup] = useState<SchedulerCustomerLookupDto | null>(null);
  const [email, setEmail] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerMiddleName, setCustomerMiddleName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>('existing');
  const [existingVehicleId, setExistingVehicleId] = useState('');
  const [vehicle, setVehicle] = useState<VehicleFormState>(EMPTY_VEHICLE);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setLookupState('idle');
    setCustomerLookup(null);
    setEmail('');
    setCustomerFirstName('');
    setCustomerMiddleName('');
    setCustomerLastName('');
    setCustomerPhone('');
    setTaskDescription('');
    setVehicleMode('existing');
    setExistingVehicleId('');
    setVehicle(EMPTY_VEHICLE);
    setErrorKey(null);
    setDueDateTime(getDefaultDueDate(selectedDate));
  }, [isOpen, selectedDate]);

  const selectedDayLabel = useMemo(() => {
    return new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(selectedDate);
  }, [i18n.language, selectedDate]);

  const shouldShowCustomerCreate = lookupState === 'not-found';
  const shouldShowVehicleCreate = lookupState === 'not-found' || vehicleMode === 'new';
  const customerHasVehicles = (customerLookup?.vehicles.length ?? 0) > 0;

  const handleLookup = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorKey('scheduler.intake.errors.emailRequired');
      return;
    }

    setIsSearching(true);
    setErrorKey(null);

    try {
      const lookup = await appointmentService.findCustomerByEmail(normalizedEmail);
      if (lookup) {
        setLookupState('found');
        setCustomerLookup(lookup);
        setVehicleMode(lookup.vehicles.length > 0 ? 'existing' : 'new');
        setExistingVehicleId(lookup.vehicles[0]?.id ? String(lookup.vehicles[0].id) : '');
      } else {
        setLookupState('not-found');
        setCustomerLookup(null);
        setVehicleMode('new');
        setExistingVehicleId('');
      }
    } catch {
      setErrorKey('scheduler.intake.errors.searchFailed');
    } finally {
      setIsSearching(false);
    }
  }, [email]);

  const handleVehicleField = useCallback((field: keyof VehicleFormState, value: string) => {
    setVehicle((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleCreate = useCallback(async () => {
    if (lookupState === 'idle') {
      setErrorKey('scheduler.intake.errors.searchRequired');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorKey('scheduler.intake.errors.emailRequired');
      return;
    }

    if (!dueDateTime) {
      setErrorKey('scheduler.intake.errors.dueRequired');
      return;
    }

    const selectedDayStart = new Date(selectedDate);
    selectedDayStart.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (selectedDayStart.getTime() < todayStart.getTime()) {
      setErrorKey('scheduler.intake.errors.scheduledInPast');
      return;
    }

    const autoScheduledDate = getDefaultScheduledDate(selectedDate);

    if (new Date(dueDateTime).getTime() < new Date(autoScheduledDate).getTime()) {
      setErrorKey('scheduler.intake.errors.dueBeforeScheduled');
      return;
    }

    if (!taskDescription.trim()) {
      setErrorKey('scheduler.intake.errors.taskRequired');
      return;
    }

    const basePayload: SchedulerCreateIntakeRequest = {
      customerEmail: normalizedEmail,
      scheduledDate: toIso(autoScheduledDate),
      dueDateTime: toIso(dueDateTime),
      taskDescription: taskDescription.trim(),
    };

    if (lookupState === 'found') {
      if (vehicleMode === 'existing') {
        if (!existingVehicleId) {
          setErrorKey('scheduler.intake.errors.vehicleSelectionRequired');
          return;
        }

        basePayload.vehicleId = Number(existingVehicleId);
      } else {
        basePayload.vehicle = buildVehiclePayload(vehicle);
      }
    }

    if (lookupState === 'not-found') {
      if (!customerFirstName.trim() || !customerLastName.trim()) {
        setErrorKey('scheduler.intake.errors.customerNameRequired');
        return;
      }

      basePayload.customerFirstName = customerFirstName.trim();
      basePayload.customerMiddleName = customerMiddleName.trim() || undefined;
      basePayload.customerLastName = customerLastName.trim();
      basePayload.customerPhoneNumber = customerPhone.trim() || undefined;
      basePayload.vehicle = buildVehiclePayload(vehicle);
    }

    setIsSubmitting(true);
    setErrorKey(null);

    try {
      await onSubmit(basePayload);
      onClose();
    } catch (error) {
      setErrorKey(mapIntakeErrorToKey(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    customerFirstName,
    customerLastName,
    customerMiddleName,
    customerPhone,
    dueDateTime,
    email,
    existingVehicleId,
    lookupState,
    onClose,
    onSubmit,
    selectedDate,
    taskDescription,
    vehicle,
    vehicleMode,
  ]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('scheduler.intake.title')}
      widthClassName="max-w-4xl"
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#D8D2E9] px-4 py-2 text-sm font-medium text-[#2C2440] transition-colors hover:bg-[#E6DCF8] dark:border-[#3A3154] dark:text-[#EDE8FA] dark:hover:bg-[#322B47]"
          >
            {t('scheduler.intake.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCreate();
            }}
            disabled={isSubmitting}
            className="rounded-lg bg-[#C9B3FF] px-4 py-2 text-sm font-semibold text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6]"
          >
            {isSubmitting ? t('scheduler.intake.creating') : t('scheduler.intake.create')}
          </button>
        </div>
      )}
    >
      <div className="max-h-[64vh] space-y-4 overflow-y-auto pr-1">
        <div className="rounded-xl border border-[#D8D2E9] bg-[#EFEBFA] px-3 py-2 text-sm text-[#2C2440] dark:border-[#3A3154] dark:bg-[#241F33] dark:text-[#EDE8FA]">
          <span className="font-medium">{t('scheduler.intake.selectedDay')}</span> {selectedDayLabel}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
            <span className="font-medium">{t('scheduler.intake.dueDateTime')}</span>
            <input
              type="datetime-local"
              value={dueDateTime}
              onChange={(event) => setDueDateTime(event.target.value)}
              className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
            />
          </label>
        </div>

        <div className="rounded-xl border border-[#D8D2E9] bg-[#F6F4FB] p-3 text-sm dark:border-[#3A3154] dark:bg-[#13131B]">
          <span className="font-medium text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.intake.statusLabel')}</span>
          <p className="mt-1 inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            {t('scheduler.status.inprogress')}
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-[#D8D2E9] bg-[#F6F4FB] p-3 dark:border-[#3A3154] dark:bg-[#13131B]">
          <h3 className="text-sm font-semibold text-[#2C2440] dark:text-[#EDE8FA]">{t('scheduler.intake.customerLookup')}</h3>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.customerEmail')}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('scheduler.intake.customerEmailPlaceholder')}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                void handleLookup();
              }}
              disabled={isSearching}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#C9B3FF] px-4 py-2 text-sm font-semibold text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6]"
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

        {shouldShowCustomerCreate && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#D8D2E9] bg-[#F6F4FB] p-3 dark:border-[#3A3154] dark:bg-[#13131B] lg:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.customerFirstName')}</span>
              <input
                value={customerFirstName}
                onChange={(event) => setCustomerFirstName(filterNameInput(event.target.value))}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.customerMiddleNameOptional')}</span>
              <input
                value={customerMiddleName}
                onChange={(event) => setCustomerMiddleName(filterNameInput(event.target.value))}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.customerLastName')}</span>
              <input
                value={customerLastName}
                onChange={(event) => setCustomerLastName(filterNameInput(event.target.value))}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.customerPhoneOptional')}</span>
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(filterPhoneInput(event.target.value))}
                placeholder={t('scheduler.intake.customerPhonePlaceholder')}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>
          </div>
        )}

        {lookupState === 'found' && (
          <div className="space-y-3 rounded-xl border border-[#D8D2E9] bg-[#F6F4FB] p-3 dark:border-[#3A3154] dark:bg-[#13131B]">
            <h3 className="text-sm font-semibold text-[#2C2440] dark:text-[#EDE8FA]">{t('scheduler.intake.vehicleModeTitle')}</h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setVehicleMode('existing')}
                disabled={!customerHasVehicles}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${vehicleMode === 'existing' ? 'bg-[#C9B3FF] text-[#2C2440] dark:bg-[#7A66C7] dark:text-[#F5F2FF]' : 'bg-[#EFEBFA] text-[#5E5672] dark:bg-[#241F33] dark:text-[#CFC5EA]'} disabled:opacity-50`}
              >
                {t('scheduler.intake.useExistingVehicle')}
              </button>
              <button
                type="button"
                onClick={() => setVehicleMode('new')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${vehicleMode === 'new' ? 'bg-[#C9B3FF] text-[#2C2440] dark:bg-[#7A66C7] dark:text-[#F5F2FF]' : 'bg-[#EFEBFA] text-[#5E5672] dark:bg-[#241F33] dark:text-[#CFC5EA]'}`}
              >
                {t('scheduler.intake.createNewVehicle')}
              </button>
            </div>

            {vehicleMode === 'existing' && (
              <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
                <span className="font-medium">{t('scheduler.intake.selectVehicle')}</span>
                <select
                  value={existingVehicleId}
                  onChange={(event) => setExistingVehicleId(event.target.value)}
                  className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
                >
                  <option value="">{t('scheduler.intake.selectVehiclePlaceholder')}</option>
                  {customerLookup?.vehicles.map((vehicleItem) => (
                    <option key={vehicleItem.id} value={vehicleItem.id}>
                      {vehicleItem.licensePlate} - {vehicleItem.brand} {vehicleItem.model} ({vehicleItem.year})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {shouldShowVehicleCreate && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#D8D2E9] bg-[#F6F4FB] p-3 dark:border-[#3A3154] dark:bg-[#13131B] lg:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.vehicleLicensePlate')}</span>
              <input
                value={vehicle.licensePlate}
                onChange={(event) => handleVehicleField('licensePlate', event.target.value.toUpperCase())}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm uppercase dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.vehicleBrand')}</span>
              <input
                value={vehicle.brand}
                onChange={(event) => handleVehicleField('brand', event.target.value)}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.vehicleModel')}</span>
              <input
                value={vehicle.model}
                onChange={(event) => handleVehicleField('model', event.target.value)}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.vehicleYear')}</span>
              <input
                type="number"
                min={1886}
                max={2100}
                value={vehicle.year}
                onChange={(event) => handleVehicleField('year', event.target.value)}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.vehicleMileageKm')}</span>
              <input
                type="number"
                min={0}
                value={vehicle.mileageKm}
                onChange={(event) => handleVehicleField('mileageKm', event.target.value)}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.vehicleEnginePowerHp')}</span>
              <input
                type="number"
                min={0}
                value={vehicle.enginePowerHp}
                onChange={(event) => handleVehicleField('enginePowerHp', event.target.value)}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="font-medium">{t('scheduler.intake.vehicleEngineTorqueNm')}</span>
              <input
                type="number"
                min={0}
                value={vehicle.engineTorqueNm}
                onChange={(event) => handleVehicleField('engineTorqueNm', event.target.value)}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
          <span className="font-medium">{t('scheduler.intake.taskDescription')}</span>
          <textarea
            value={taskDescription}
            onChange={(event) => setTaskDescription(event.target.value)}
            maxLength={200}
            rows={4}
            className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
          />
        </label>

        <FormErrorMessage message={errorKey} className="mt-2" />
      </div>
    </Modal>
  );
});

SchedulerIntakeModalComponent.displayName = 'SchedulerIntakeModal';

export const SchedulerIntakeModal = SchedulerIntakeModalComponent;
