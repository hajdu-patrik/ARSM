import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Clock3, LogOut, UserPlus, X } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus, UpdateAppointmentRequest } from '../../../types/scheduler.types';
import { adminService } from '../../../services/admin.service';
import type { MechanicListItem } from '../../../services/admin.service';
import { Modal } from '../../../components/common/Modal';
import { FormErrorMessage } from '../../../components/common/FormErrorMessage';
import { StatusBadge } from './StatusBadge';
import { MechanicAvatar } from './MechanicAvatar';
import { getDueState } from './due-date';

interface AppointmentDetailModalProps {
  readonly appointment: AppointmentDto | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentMechanicId: number | undefined;
  readonly isAdmin: boolean;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onStatusChange: (id: number, status: AppointmentStatus) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
  readonly onAdminAssign: (appointmentId: number, mechanicId: number) => Promise<void>;
  readonly onAdminUnassign: (appointmentId: number, mechanicId: number) => Promise<void>;
  readonly onUpdate: (id: number, request: UpdateAppointmentRequest) => Promise<void>;
}

const STATUS_OPTIONS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];

interface EditFormState {
  scheduledDate: string;
  dueDateTime: string;
  taskDescription: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: string;
  mileageKm: string;
  enginePowerHp: string;
  engineTorqueNm: string;
}

function toDatetimeLocalValue(isoValue: string): string {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

const AppointmentDetailModalComponent = memo(function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
  currentMechanicId,
  isAdmin,
  onClaim,
  onStatusChange,
  onUnclaim,
  onAdminAssign,
  onAdminUnassign,
  onUpdate,
}: AppointmentDetailModalProps) {
  const { t, i18n } = useTranslation();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnclaiming, setIsUnclaiming] = useState(false);
  const [removingMechanicId, setRemovingMechanicId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [allMechanics, setAllMechanics] = useState<MechanicListItem[]>([]);
  const [selectedNewMechanicId, setSelectedNewMechanicId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editErrorKey, setEditErrorKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  useEffect(() => {
    if (!appointment) {
      setEditForm(null);
      setIsEditing(false);
      setEditErrorKey(null);
      return;
    }

    setEditForm({
      scheduledDate: toDatetimeLocalValue(appointment.scheduledDate),
      dueDateTime: toDatetimeLocalValue(appointment.dueDateTime),
      taskDescription: appointment.taskDescription,
      licensePlate: appointment.vehicle.licensePlate,
      brand: appointment.vehicle.brand,
      model: appointment.vehicle.model,
      year: String(appointment.vehicle.year),
      mileageKm: String(appointment.vehicle.mileageKm),
      enginePowerHp: String(appointment.vehicle.enginePowerHp),
      engineTorqueNm: String(appointment.vehicle.engineTorqueNm),
    });
    setIsEditing(false);
    setEditErrorKey(null);
  }, [appointment]);

  // Fetch mechanic list for admin assign dropdown
  useEffect(() => {
    if (!isAdmin || !isOpen) return;
    let cancelled = false;

    const fetchMechanics = async () => {
      try {
        const data = await adminService.listMechanics();
        if (!cancelled) {
          setAllMechanics(data);
        }
      } catch {
        // Silently fail - dropdown will be empty
      }
    };

    void fetchMechanics();
    return () => { cancelled = true; };
  }, [isAdmin, isOpen]);

  const handleClaim = useCallback(async () => {
    if (!appointment) return;
    setIsClaiming(true);
    try {
      await onClaim(appointment.id);
    } finally {
      setIsClaiming(false);
    }
  }, [onClaim, appointment]);

  const handleStatusChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!appointment) return;
    const newStatus = e.target.value as AppointmentStatus;
    setIsUpdating(true);
    try {
      await onStatusChange(appointment.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  }, [onStatusChange, appointment]);

  const handleUnclaim = useCallback(async () => {
    if (!appointment) return;
    setIsUnclaiming(true);
    try {
      await onUnclaim(appointment.id);
    } finally {
      setIsUnclaiming(false);
    }
  }, [onUnclaim, appointment]);

  const handleAdminRemove = useCallback(async (mechanicId: number) => {
    if (!appointment) return;
    setRemovingMechanicId(mechanicId);
    try {
      await onAdminUnassign(appointment.id, mechanicId);
    } finally {
      setRemovingMechanicId(null);
    }
  }, [onAdminUnassign, appointment]);

  const handleAdminAssign = useCallback(async () => {
    if (!appointment || !selectedNewMechanicId) return;
    const mechanicId = Number(selectedNewMechanicId);
    setIsAssigning(true);
    try {
      await onAdminAssign(appointment.id, mechanicId);
      setSelectedNewMechanicId('');
    } finally {
      setIsAssigning(false);
    }
  }, [onAdminAssign, appointment, selectedNewMechanicId]);

  const handleEditField = useCallback((field: keyof EditFormState, value: string) => {
    setEditForm((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!appointment || !editForm) {
      return;
    }

    const isPastAppointment = new Date(appointment.scheduledDate).getTime() < Date.now();

    const taskDescription = editForm.taskDescription.trim();
    if (!taskDescription) {
      setEditErrorKey('scheduler.intake.errors.taskRequired');
      return;
    }

    if (!isPastAppointment && !editForm.scheduledDate) {
      setEditErrorKey('scheduler.intake.errors.scheduledRequired');
      return;
    }

    if (!editForm.dueDateTime) {
      setEditErrorKey('scheduler.intake.errors.dueRequired');
      return;
    }

    const scheduledMs = isPastAppointment
      ? Date.parse(appointment.scheduledDate)
      : Date.parse(editForm.scheduledDate);

    if (Number.isNaN(scheduledMs)) {
      setEditErrorKey('scheduler.intake.errors.scheduledRequired');
      return;
    }

    const dueMs = Date.parse(editForm.dueDateTime);
    if (Number.isNaN(dueMs)) {
      setEditErrorKey('scheduler.intake.errors.dueRequired');
      return;
    }

    const effectiveScheduledDateIso = new Date(scheduledMs).toISOString();
    const dueDateTimeIso = new Date(dueMs).toISOString();

    if (dueMs < scheduledMs) {
      setEditErrorKey('scheduler.intake.errors.dueBeforeScheduled');
      return;
    }

    if (!editForm.licensePlate.trim() || !editForm.brand.trim() || !editForm.model.trim()) {
      setEditErrorKey('scheduler.intake.errors.vehicleRequiredFields');
      return;
    }

    const year = Number(editForm.year);
    const mileageKm = Number(editForm.mileageKm);
    const enginePowerHp = Number(editForm.enginePowerHp);
    const engineTorqueNm = Number(editForm.engineTorqueNm);

    if (!Number.isInteger(year) || year < 1886 || year > 2100) {
      setEditErrorKey('scheduler.intake.errors.vehicleYearInvalid');
      return;
    }

    if (
      Number.isNaN(mileageKm) || mileageKm < 0 ||
      Number.isNaN(enginePowerHp) || enginePowerHp < 0 ||
      Number.isNaN(engineTorqueNm) || engineTorqueNm < 0
    ) {
      setEditErrorKey('scheduler.intake.errors.vehicleNumberInvalid');
      return;
    }

    const request: UpdateAppointmentRequest = {
      scheduledDate: effectiveScheduledDateIso,
      dueDateTime: dueDateTimeIso,
      taskDescription,
      licensePlate: editForm.licensePlate.trim(),
      brand: editForm.brand.trim(),
      model: editForm.model.trim(),
      year,
      mileageKm,
      enginePowerHp,
      engineTorqueNm,
    };

    setIsSaving(true);
    setEditErrorKey(null);
    try {
      await onUpdate(appointment.id, request);
      setIsEditing(false);
    } catch {
      setEditErrorKey('scheduler.detail.updateError');
    } finally {
      setIsSaving(false);
    }
  }, [appointment, editForm, onUpdate]);

  if (!appointment) return null;

  const { vehicle } = appointment;
  const isAssigned = currentMechanicId !== undefined &&
    appointment.mechanics.some((m) => m.id === currentMechanicId);
  const isCancelled = appointment.status === 'Cancelled';
  const canEdit = isAdmin || isAssigned;

  const assignedMechanicIds = new Set(appointment.mechanics.map((m) => m.id));
  const availableMechanics = allMechanics.filter((m) => !assignedMechanicIds.has(m.personId));

  const formattedDate = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(appointment.scheduledDate));

  const dueDateLabel = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(appointment.dueDateTime));

  const dueState = getDueState(appointment.dueDateTime);
  const isExpired = dueState.isOverdue;
  const isPastAppointment = new Date(appointment.scheduledDate).getTime() < Date.now();
  const shouldShowClaimButton = !isAssigned && !isCancelled && !isExpired;

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-2">
      {canEdit && !isEditing && (
        <button
          onClick={() => {
            setIsEditing(true);
            setEditErrorKey(null);
          }}
          className="rounded-xl border border-[#D8D2E9] px-3 py-1.5 text-sm font-medium text-[#2C2440] transition-colors hover:bg-[#E6DCF8] dark:border-[#3A3154] dark:text-[#EDE8FA] dark:hover:bg-[#322B47]"
        >
          {t('scheduler.detail.edit')}
        </button>
      )}

      {isEditing && (
        <>
          <button
            onClick={() => {
              setIsEditing(false);
              setEditErrorKey(null);
            }}
            disabled={isSaving}
            className="rounded-xl border border-[#D8D2E9] px-3 py-1.5 text-sm font-medium text-[#2C2440] transition-colors hover:bg-[#E6DCF8] disabled:opacity-50 dark:border-[#3A3154] dark:text-[#EDE8FA] dark:hover:bg-[#322B47]"
          >
            {t('scheduler.intake.cancel')}
          </button>
          <button
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving}
            className="rounded-xl bg-[#C9B3FF] px-3 py-1.5 text-sm font-semibold text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6]"
          >
            {isSaving ? t('scheduler.detail.saving') : t('scheduler.detail.save')}
          </button>
        </>
      )}

      {isAssigned && (
        <select
          value={appointment.status}
          onChange={(e) => { void handleStatusChange(e); }}
          disabled={isUpdating}
          className="min-w-[11rem] flex-1 py-1.5 px-2 rounded-lg border border-[#D8D2E9] dark:border-[#3A3154] bg-[#F6F4FB] dark:bg-[#1A1A25] text-sm text-[#2C2440] dark:text-[#EDE8FA] disabled:opacity-50 focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`scheduler.status.${s.toLowerCase()}`)}
            </option>
          ))}
        </select>
      )}

      {isAssigned && (
        <div className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
          <Check className="w-4 h-4" />
          {t('scheduler.assigned')}
        </div>
      )}

      {shouldShowClaimButton && (
        <button
          onClick={() => { void handleClaim(); }}
          disabled={isClaiming}
          className="w-full py-2 rounded-xl bg-[#C9B3FF] text-[#2C2440] dark:bg-[#7A66C7] dark:text-[#F5F2FF] hover:bg-[#BFA6F7] dark:hover:bg-[#8A75D6] text-sm font-medium transition-colors disabled:opacity-50 sm:w-auto sm:min-w-[10rem]"
        >
          {isClaiming ? '...' : t('scheduler.claim')}
        </button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('scheduler.detail.title')}
      widthClassName="max-w-3xl"
      footer={footer}
    >
      <div className="flex max-h-[62vh] flex-col gap-4 overflow-y-auto overflow-x-hidden pr-1">
        {editErrorKey && <FormErrorMessage message={editErrorKey} />}

        {/* Status + date row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <StatusBadge status={appointment.status} />
          {isEditing && editForm && !isPastAppointment ? (
            <label className="flex min-w-[18rem] flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.scheduledDate')}</span>
              <input
                type="datetime-local"
                value={editForm.scheduledDate}
                onChange={(event) => handleEditField('scheduledDate', event.target.value)}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>
          ) : (
            <span className="text-sm text-[#6A627F] dark:text-[#B9B0D3]">
              {formattedDate}
            </span>
          )}
        </div>

        {/* Due state */}
        <div className={`rounded-xl border px-4 py-3 ${dueState.isOverdue ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30' : 'border-[#D8D2E9] bg-[#EFEBFA] dark:border-[#3A3154] dark:bg-[#241F33]'}`}>
          <div className="flex items-center gap-2 text-sm text-[#6A627F] dark:text-[#B9B0D3]">
            <Clock3 className="h-4 w-4" />
            {t('scheduler.due.label')}
          </div>
          <p className={`mt-1 text-lg font-bold ${dueState.toneClassName}`}>
            {t(dueState.labelKey, dueState.labelValues)}
          </p>
          <p className="mt-0.5 text-xs text-[#6A627F] dark:text-[#B9B0D3]">
            {t('scheduler.due.exact', { date: dueDateLabel })}
          </p>
          {isEditing && editForm && (
            <label className="mt-2 flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.intake.dueDateTime')}</span>
              <input
                type="datetime-local"
                value={editForm.dueDateTime}
                onChange={(event) => handleEditField('dueDateTime', event.target.value)}
                className="rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
              />
            </label>
          )}
        </div>

        {/* Vehicle section */}
        <div>
          <h4 className="text-base font-semibold text-[#2C2440] dark:text-[#EDE8FA] mb-2">
            {isEditing && editForm
              ? `${editForm.brand} ${editForm.model} (${editForm.year})`
              : `${vehicle.brand} ${vehicle.model} (${vehicle.year})`}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.licensePlate')}</span>
              {isEditing && editForm ? (
                <input
                  value={editForm.licensePlate}
                  onChange={(event) => handleEditField('licensePlate', event.target.value.toUpperCase())}
                  className="w-40 rounded border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1 text-sm font-mono uppercase dark:border-[#3A3154] dark:bg-[#1A1A25]"
                />
              ) : (
                <span className="truncate text-sm font-mono text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.licensePlate}</span>
              )}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.intake.vehicleBrand')}</span>
              {isEditing && editForm ? (
                <input
                  value={editForm.brand}
                  onChange={(event) => handleEditField('brand', event.target.value)}
                  className="w-40 rounded border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
                />
              ) : (
                <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.brand}</span>
              )}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.intake.vehicleModel')}</span>
              {isEditing && editForm ? (
                <input
                  value={editForm.model}
                  onChange={(event) => handleEditField('model', event.target.value)}
                  className="w-40 rounded border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
                />
              ) : (
                <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.model}</span>
              )}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.intake.vehicleYear')}</span>
              {isEditing && editForm ? (
                <input
                  type="number"
                  value={editForm.year}
                  onChange={(event) => handleEditField('year', event.target.value)}
                  className="w-40 rounded border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
                />
              ) : (
                <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.year}</span>
              )}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.intake.vehicleMileageKm')}</span>
              {isEditing && editForm ? (
                <input
                  type="number"
                  value={editForm.mileageKm}
                  onChange={(event) => handleEditField('mileageKm', event.target.value)}
                  className="w-40 rounded border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
                />
              ) : (
                <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.mileageKm.toLocaleString()} km</span>
              )}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.intake.vehicleEnginePowerHp')}</span>
              {isEditing && editForm ? (
                <input
                  type="number"
                  value={editForm.enginePowerHp}
                  onChange={(event) => handleEditField('enginePowerHp', event.target.value)}
                  className="w-40 rounded border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
                />
              ) : (
                <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.enginePowerHp} HP</span>
              )}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.intake.vehicleEngineTorqueNm')}</span>
              {isEditing && editForm ? (
                <input
                  type="number"
                  value={editForm.engineTorqueNm}
                  onChange={(event) => handleEditField('engineTorqueNm', event.target.value)}
                  className="w-40 rounded border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1 text-sm dark:border-[#3A3154] dark:bg-[#1A1A25]"
                />
              ) : (
                <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.engineTorqueNm} Nm</span>
              )}
            </div>
          </div>
        </div>

        {/* Task section */}
        <div>
          <h4 className="text-sm font-medium text-[#6A627F] dark:text-[#B9B0D3] mb-1">{t('scheduler.detail.task')}</h4>
          <div className="bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
            {isEditing && editForm ? (
              <textarea
                value={editForm.taskDescription}
                onChange={(event) => handleEditField('taskDescription', event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 text-sm text-[#2C2440] dark:border-[#3A3154] dark:bg-[#1A1A25] dark:text-[#EDE8FA]"
              />
            ) : (
              <p className="break-words text-sm text-[#2C2440] dark:text-[#EDE8FA]">{appointment.taskDescription}</p>
            )}
          </div>
        </div>

        {/* Customer section */}
        <div>
          <h4 className="text-sm font-medium text-[#6A627F] dark:text-[#B9B0D3] mb-1">{t('scheduler.detail.customer')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.customerName')}</span>
              <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]" title={vehicle.customer.fullName}>{vehicle.customer.fullName}</span>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.customerEmail')}</span>
              <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]" title={vehicle.customer.email}>{vehicle.customer.email}</span>
            </div>
          </div>
        </div>

        {/* Mechanics section */}
        <div>
          <h4 className="text-sm font-medium text-[#6A627F] dark:text-[#B9B0D3] mb-1">{t('scheduler.detail.mechanics')}</h4>
          {appointment.mechanics.length === 0 ? (
            <p className="text-sm text-[#6A627F] dark:text-[#B9B0D3] italic">{t('scheduler.detail.noMechanics')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {appointment.mechanics.map((m) => {
                const isCurrentUser = currentMechanicId !== undefined && m.id === currentMechanicId;
                return (
                  <div
                    key={m.id}
                    className="bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]"
                  >
                    <div className="flex items-start gap-2">
                      <MechanicAvatar
                        mechanicId={m.id}
                        fullName={m.fullName}
                        hasProfilePicture={m.hasProfilePicture}
                        sizeClassName="h-8 w-8 text-xs"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="break-words text-sm font-medium text-[#2C2440] dark:text-[#EDE8FA]">{m.fullName}</span>
                          <span className="text-xs bg-[#D8D2E9] dark:bg-[#3A3154] text-[#2C2440] dark:text-[#EDE8FA] px-2 py-0.5 rounded-full">
                            {m.specialization}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {m.expertise.map((exp) => (
                            <span
                              key={exp}
                              className="max-w-full break-all text-xs bg-[#C9B3FF]/30 dark:bg-[#7A66C7]/30 text-[#5E5672] dark:text-[#CFC5EA] px-2 py-0.5 rounded-full"
                            >
                              {exp}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="ml-auto flex shrink-0 items-start gap-1">
                        {isCurrentUser && !isAdmin && (
                          <button
                            onClick={() => { void handleUnclaim(); }}
                            disabled={isUnclaiming}
                            title={t('scheduler.detail.unassignMe')}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{isUnclaiming ? '...' : t('scheduler.detail.unassignMe')}</span>
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => { void handleAdminRemove(m.id); }}
                            disabled={removingMechanicId === m.id || isCancelled}
                            title={t('scheduler.detail.removeMechanic')}
                            className="p-1 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Admin: Add mechanic section */}
          {isAdmin && !isExpired && (
            <div className="mt-3">
              <h5 className="text-xs font-medium text-[#6A627F] dark:text-[#B9B0D3] mb-1.5 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                {t('scheduler.detail.addMechanic')}
              </h5>
              {isCancelled && (
                <p className="text-xs text-[#6A627F] dark:text-[#B9B0D3] italic mb-1">
                  {t('scheduler.detail.cancelledMechanicHint')}
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedNewMechanicId}
                  onChange={(e) => setSelectedNewMechanicId(e.target.value)}
                  disabled={isCancelled}
                  className="w-full min-w-0 py-1.5 px-2 rounded-lg border border-[#D8D2E9] dark:border-[#3A3154] bg-[#F6F4FB] dark:bg-[#1A1A25] text-sm text-[#2C2440] dark:text-[#EDE8FA] sm:flex-1 disabled:opacity-50 focus:outline-none"
                >
                  <option value="">{t('scheduler.detail.selectMechanic')}</option>
                  {availableMechanics.map((m) => {
                    const name = [m.firstName, m.middleName, m.lastName].filter(Boolean).join(' ');
                    return (
                      <option key={m.personId} value={m.personId}>{name}</option>
                    );
                  })}
                </select>
                <button
                  onClick={() => { void handleAdminAssign(); }}
                  disabled={isAssigning || !selectedNewMechanicId || isCancelled}
                  className="w-full shrink-0 px-3 py-1.5 rounded-lg bg-[#C9B3FF] text-[#2C2440] dark:bg-[#7A66C7] dark:text-[#F5F2FF] hover:bg-[#BFA6F7] dark:hover:bg-[#8A75D6] text-sm font-medium transition-colors disabled:opacity-50 sm:w-auto"
                >
                  {isAssigning ? '...' : t('scheduler.detail.addMechanic')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
});

AppointmentDetailModalComponent.displayName = 'AppointmentDetailModal';

export const AppointmentDetailModal = AppointmentDetailModalComponent;
