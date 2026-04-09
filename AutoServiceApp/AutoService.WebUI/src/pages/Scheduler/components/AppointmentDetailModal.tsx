import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, UserPlus, LogOut } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus } from '../../../types/scheduler.types';
import { adminService } from '../../../services/admin.service';
import type { MechanicListItem } from '../../../services/admin.service';
import { Modal } from '../../../components/common/Modal';
import { StatusBadge } from './StatusBadge';
import { MechanicAvatar } from './MechanicAvatar';

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
}

const STATUS_OPTIONS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];

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
}: AppointmentDetailModalProps) {
  const { t, i18n } = useTranslation();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnclaiming, setIsUnclaiming] = useState(false);
  const [removingMechanicId, setRemovingMechanicId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [allMechanics, setAllMechanics] = useState<MechanicListItem[]>([]);
  const [selectedNewMechanicId, setSelectedNewMechanicId] = useState<string>('');

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

  if (!appointment) return null;

  const { vehicle } = appointment;
  const isAssigned = currentMechanicId !== undefined &&
    appointment.mechanics.some((m) => m.id === currentMechanicId);
  const isCancelled = appointment.status === 'Cancelled';
  const shouldShowClaimButton = !isAssigned && !isCancelled;

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

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-2">
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
        {/* Status + date row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <StatusBadge status={appointment.status} />
          <span className="text-sm text-[#6A627F] dark:text-[#B9B0D3]">
            {formattedDate}
          </span>
        </div>

        {/* Vehicle section */}
        <div>
          <h4 className="text-base font-semibold text-[#2C2440] dark:text-[#EDE8FA] mb-2">
            {vehicle.brand} {vehicle.model} ({vehicle.year})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.licensePlate')}</span>
              <span className="truncate text-sm font-mono text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.licensePlate}</span>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.specs.mileage', { value: '' }).trim()}</span>
              <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.mileageKm.toLocaleString()} km</span>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.specs.power', { value: '' }).trim()}</span>
              <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.enginePowerHp} HP</span>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
              <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.specs.torque', { value: '' }).trim()}</span>
              <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]">{vehicle.engineTorqueNm} Nm</span>
            </div>
          </div>
        </div>

        {/* Task section */}
        <div>
          <h4 className="text-sm font-medium text-[#6A627F] dark:text-[#B9B0D3] mb-1">{t('scheduler.detail.task')}</h4>
          <div className="bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 border border-[#D8D2E9] dark:border-[#3A3154]">
            <p className="break-words text-sm text-[#2C2440] dark:text-[#EDE8FA]">{appointment.taskDescription}</p>
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
          {isAdmin && (
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
