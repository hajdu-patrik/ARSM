import { memo } from 'react';
import { Clock3, LogOut, UserPlus, X } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import type { EditFormState } from './AppointmentDetailModal.edit';
import type { DueState } from '../../utils/due-date';
import { inputClassCompact } from '../../../../utils/formStyles';
import { StatusBadge } from '../shared/StatusBadge';
import { MechanicAvatar } from '../shared/MechanicAvatar';

interface AppointmentDetailBodyProps {
  readonly appointment: AppointmentDto;
  readonly currentMechanicId: number | undefined;
  readonly isAdmin: boolean;
  readonly isEditing: boolean;
  readonly editForm: EditFormState | null;
  readonly formattedDate: string;
  readonly dueDateLabel: string;
  readonly dueState: DueState;
  readonly availableMechanics: Array<{ personId: number; firstName: string; middleName: string | null; lastName: string }>;
  readonly selectedNewMechanicId: string;
  readonly isAssigning: boolean;
  readonly isClosedForMechanicMutations: boolean;
  readonly isUnclaiming: boolean;
  readonly removingMechanicId: number | null;
  readonly t: TFunction;
  readonly onEditField: (field: keyof EditFormState, value: string) => void;
  readonly onUnclaim: () => void;
  readonly onQueueRemoveMechanic: (mechanic: { id: number; fullName: string }) => void;
  readonly onSelectNewMechanic: (value: string) => void;
  readonly onAdminAssign: () => void;
}

/**
 * Renders the appointment detail modal body sections and wires section-level callbacks.
 * Handles edit-mode rendering and mechanic mutation controls without owning modal state.
 */
export const AppointmentDetailBody = memo(function AppointmentDetailBody({
  appointment,
  currentMechanicId,
  isAdmin,
  isEditing,
  editForm,
  formattedDate,
  dueDateLabel,
  dueState,
  availableMechanics,
  selectedNewMechanicId,
  isAssigning,
  isClosedForMechanicMutations,
  isUnclaiming,
  removingMechanicId,
  t,
  onEditField,
  onUnclaim,
  onQueueRemoveMechanic,
  onSelectNewMechanic,
  onAdminAssign,
}: AppointmentDetailBodyProps) {
  return (
    <div className="flex max-h-[62vh] flex-col gap-4 overflow-x-hidden overflow-y-auto pr-1 pb-0.5">
      <HeaderSection
        appointmentStatus={appointment.status}
        formattedDate={formattedDate}
      />

      <DueSection
        dueState={dueState}
        dueDateLabel={dueDateLabel}
        isEditing={isEditing}
        dueDateTime={editForm?.dueDateTime ?? ''}
        t={t}
        onDueDateTimeChange={(value) => onEditField('dueDateTime', value)}
      />

      <VehicleSection
        appointment={appointment}
        t={t}
      />

      <TaskSection
        isEditing={isEditing}
        taskDescription={editForm?.taskDescription ?? appointment.taskDescription}
        displayTask={appointment.taskDescription}
        t={t}
        onTaskChange={(value) => onEditField('taskDescription', value)}
      />

      {!isEditing && (
        <MechanicsSection
          appointment={appointment}
          currentMechanicId={currentMechanicId}
          isAdmin={isAdmin}
          isAssigning={isAssigning}
          isClosedForMechanicMutations={isClosedForMechanicMutations}
          isUnclaiming={isUnclaiming}
          removingMechanicId={removingMechanicId}
          availableMechanics={availableMechanics}
          selectedNewMechanicId={selectedNewMechanicId}
          t={t}
          onUnclaim={onUnclaim}
          onQueueRemoveMechanic={onQueueRemoveMechanic}
          onSelectNewMechanic={onSelectNewMechanic}
          onAdminAssign={onAdminAssign}
        />
      )}
    </div>
  );
});

interface HeaderSectionProps {
  readonly appointmentStatus: AppointmentStatus;
  readonly formattedDate: string;
}

const HeaderSection = memo(function HeaderSection({
  appointmentStatus,
  formattedDate,
}: HeaderSectionProps) {
  return (
    <div className="rounded-xl border border-arsm-border bg-arsm-input/80 px-3.5 py-2.5 shadow-[0_8px_18px_rgba(45,36,64,0.07)] dark:border-arsm-border-dark dark:bg-arsm-input-dark/70 dark:shadow-[0_10px_20px_rgba(3,5,14,0.32)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <StatusBadge status={appointmentStatus} />
        <span className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{formattedDate}</span>
      </div>
    </div>
  );
});

interface DueSectionProps {
  readonly dueState: DueState;
  readonly dueDateLabel: string;
  readonly isEditing: boolean;
  readonly dueDateTime: string;
  readonly t: TFunction;
  readonly onDueDateTimeChange: (value: string) => void;
}

const DueSection = memo(function DueSection({
  dueState,
  dueDateLabel,
  isEditing,
  dueDateTime,
  t,
  onDueDateTimeChange,
}: DueSectionProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-[0_10px_24px_rgba(45,36,64,0.08)] dark:shadow-[0_12px_24px_rgba(3,5,14,0.34)] ${dueState.isOverdue ? 'border-arsm-error-border bg-arsm-error-bg dark:border-arsm-error-dark/80 dark:bg-arsm-error-bg-dark' : 'border-arsm-border bg-arsm-toggle-bg dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark'}`}>
      <div className="flex items-center gap-2 text-sm text-arsm-muted dark:text-arsm-muted-dark">
        <Clock3 className="h-4 w-4" />
        {t('scheduler.due.label')}
      </div>
      <p className={`mt-1 max-w-full break-words text-base font-bold leading-tight sm:text-lg ${dueState.toneClassName}`}>
        {t(dueState.labelKey, dueState.labelValues)}
      </p>
      <p className="mt-0.5 text-xs text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.due.exact', { date: dueDateLabel })}</p>
      {isEditing && (
        <label className="mt-2 flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
          <span className="text-xs text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.intake.dueDateTime')}</span>
          <input
            type="datetime-local"
            data-testid="appointment-detail-due-datetime"
            value={dueDateTime}
            onChange={(event) => onDueDateTimeChange(event.target.value)}
            className={`${inputClassCompact} px-3 py-2`}
          />
        </label>
      )}
    </div>
  );
});

interface VehicleSectionProps {
  readonly appointment: AppointmentDto;
  readonly t: TFunction;
}

const VehicleSection = memo(function VehicleSection({ appointment, t }: VehicleSectionProps) {
  const { vehicle } = appointment;

  const title = `${vehicle.brand} ${vehicle.model} (${vehicle.year})`;

  return (
    <div className="rounded-2xl border border-arsm-border bg-arsm-input/80 p-3.5 shadow-[0_10px_22px_rgba(45,36,64,0.07)] dark:border-arsm-border-dark dark:bg-arsm-input-dark/65 dark:shadow-[0_12px_24px_rgba(3,5,14,0.32)]">
      <h4 className="mb-2 text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">{title}</h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <VehicleValueRow
          label={t('scheduler.detail.licensePlate')}
          displayValue={vehicle.licensePlate}
          displayClassName="truncate text-sm font-mono text-arsm-primary dark:text-arsm-primary-dark"
        />

        <VehicleValueRow
          label={t('scheduler.intake.vehicleBrand')}
          displayValue={vehicle.brand}
          displayClassName="truncate text-sm text-arsm-primary dark:text-arsm-primary-dark"
        />

        <VehicleValueRow
          label={t('scheduler.intake.vehicleModel')}
          displayValue={vehicle.model}
          displayClassName="truncate text-sm text-arsm-primary dark:text-arsm-primary-dark"
        />

        <VehicleValueRow
          label={t('scheduler.intake.vehicleYear')}
          displayValue={String(vehicle.year)}
          displayClassName="truncate text-sm text-arsm-primary dark:text-arsm-primary-dark"
        />

        <VehicleValueRow
          label={t('scheduler.intake.vehicleMileageKm')}
          displayValue={`${vehicle.mileageKm.toLocaleString()} km`}
          displayClassName="truncate text-sm text-arsm-primary dark:text-arsm-primary-dark"
        />

        <VehicleValueRow
          label={t('scheduler.intake.vehicleEnginePowerHp')}
          displayValue={`${vehicle.enginePowerHp} HP`}
          displayClassName="truncate text-sm text-arsm-primary dark:text-arsm-primary-dark"
        />

        <VehicleValueRow
          label={t('scheduler.intake.vehicleEngineTorqueNm')}
          displayValue={`${vehicle.engineTorqueNm} Nm`}
          displayClassName="truncate text-sm text-arsm-primary dark:text-arsm-primary-dark"
        />
      </div>
    </div>
  );
});

interface VehicleValueRowProps {
  readonly label: string;
  readonly displayValue: string;
  readonly displayClassName: string;
}

const VehicleValueRow = memo(function VehicleValueRow({
  label,
  displayValue,
  displayClassName,
}: VehicleValueRowProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-arsm-border bg-arsm-toggle-bg/90 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className="text-xs text-arsm-muted dark:text-arsm-muted-dark">{label}</span>
      <span className={displayClassName}>{displayValue}</span>
    </div>
  );
});

interface TaskSectionProps {
  readonly isEditing: boolean;
  readonly taskDescription: string;
  readonly displayTask: string;
  readonly t: TFunction;
  readonly onTaskChange: (value: string) => void;
}

const TaskSection = memo(function TaskSection({ isEditing, taskDescription, displayTask, t, onTaskChange }: TaskSectionProps) {
  return (
    <div className="rounded-2xl border border-arsm-border bg-arsm-input/80 p-3.5 shadow-[0_10px_22px_rgba(45,36,64,0.07)] dark:border-arsm-border-dark dark:bg-arsm-input-dark/65 dark:shadow-[0_12px_24px_rgba(3,5,14,0.32)]">
      <h4 className="mb-2 text-sm font-medium text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.detail.task')}</h4>
      {isEditing ? (
        <textarea
          value={taskDescription}
          onChange={(event) => onTaskChange(event.target.value)}
          rows={3}
          className={`${inputClassCompact} min-h-[6.5rem] px-3 py-2 text-arsm-primary dark:text-arsm-primary-dark`}
        />
      ) : (
        <p className="break-words text-sm text-arsm-primary dark:text-arsm-primary-dark">{displayTask}</p>
      )}
    </div>
  );
});

interface MechanicsSectionProps {
  readonly appointment: AppointmentDto;
  readonly currentMechanicId: number | undefined;
  readonly isAdmin: boolean;
  readonly isAssigning: boolean;
  readonly isClosedForMechanicMutations: boolean;
  readonly isUnclaiming: boolean;
  readonly removingMechanicId: number | null;
  readonly availableMechanics: Array<{ personId: number; firstName: string; middleName: string | null; lastName: string }>;
  readonly selectedNewMechanicId: string;
  readonly t: TFunction;
  readonly onUnclaim: () => void;
  readonly onQueueRemoveMechanic: (mechanic: { id: number; fullName: string }) => void;
  readonly onSelectNewMechanic: (value: string) => void;
  readonly onAdminAssign: () => void;
}

/**
 * Renders mechanic assignment controls and keeps all mechanic mutations mutually exclusive.
 * This prevents overlapping requests from creating stale or conflicting modal state.
 */
const MechanicsSection = memo(function MechanicsSection({
  appointment,
  currentMechanicId,
  isAdmin,
  isAssigning,
  isClosedForMechanicMutations,
  isUnclaiming,
  removingMechanicId,
  availableMechanics,
  selectedNewMechanicId,
  t,
  onUnclaim,
  onQueueRemoveMechanic,
  onSelectNewMechanic,
  onAdminAssign,
}: MechanicsSectionProps) {
  const isMechanicMutationBusy = isAssigning || isUnclaiming || removingMechanicId !== null;

  return (
    <div className="rounded-2xl border border-arsm-border bg-arsm-input/80 p-3.5 shadow-[0_10px_22px_rgba(45,36,64,0.07)] dark:border-arsm-border-dark dark:bg-arsm-input-dark/65 dark:shadow-[0_12px_24px_rgba(3,5,14,0.32)]">
      <h4 className="mb-1 text-sm font-medium text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.detail.mechanics')}</h4>
      {appointment.mechanics.length === 0 ? (
        <p className="text-sm italic text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.detail.noMechanics')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {appointment.mechanics.map((mechanic) => (
            <MechanicCard
              key={mechanic.id}
              mechanic={mechanic}
              canUnclaim={!isClosedForMechanicMutations && !isAdmin && appointment.mechanics.length > 1 && currentMechanicId !== undefined && mechanic.id === currentMechanicId}
              canRemove={!isClosedForMechanicMutations && isAdmin && appointment.mechanics.length > 1}
              isMechanicMutationLocked={isClosedForMechanicMutations || isMechanicMutationBusy}
              isUnclaiming={isUnclaiming}
              isRemoveDisabled={isClosedForMechanicMutations || isMechanicMutationBusy}
              t={t}
              onUnclaim={onUnclaim}
              onQueueRemove={() => {
                if (isClosedForMechanicMutations || isMechanicMutationBusy) {
                  return;
                }

                onQueueRemoveMechanic({ id: mechanic.id, fullName: mechanic.fullName });
              }}
            />
          ))}
        </div>
      )}

      {isAdmin && !isClosedForMechanicMutations && (
        <div className="mt-3">
          <h5 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-arsm-muted dark:text-arsm-muted-dark">
            <UserPlus className="h-3.5 w-3.5" />
            {t('scheduler.detail.addMechanic')}
          </h5>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedNewMechanicId}
              onChange={(event) => onSelectNewMechanic(event.target.value)}
              disabled={isMechanicMutationBusy}
              aria-label={t('scheduler.detail.selectMechanic')}
              className="w-full min-w-0 rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 text-sm text-arsm-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus-visible:border-arsm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:focus-visible:ring-arsm-focus-ring/22 sm:flex-1"
            >
              <option value="" disabled hidden>{t('scheduler.detail.selectMechanic')}</option>
              {availableMechanics.map((mechanic) => {
                const name = [mechanic.firstName, mechanic.middleName, mechanic.lastName].filter(Boolean).join(' ');
                return (
                  <option key={mechanic.personId} value={mechanic.personId}>{name}</option>
                );
              })}
            </select>
            <button
              onClick={onAdminAssign}
              disabled={isMechanicMutationBusy || !selectedNewMechanicId}
              className="w-full shrink-0 rounded-xl bg-arsm-accent px-3.5 py-2 text-sm font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover disabled:cursor-not-allowed disabled:opacity-50 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover sm:w-auto"
            >
              {isAssigning ? '...' : t('scheduler.detail.addMechanic')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

interface MechanicCardProps {
  readonly mechanic: AppointmentDto['mechanics'][number];
  readonly canUnclaim: boolean;
  readonly canRemove: boolean;
  readonly isMechanicMutationLocked: boolean;
  readonly isUnclaiming: boolean;
  readonly isRemoveDisabled: boolean;
  readonly t: TFunction;
  readonly onUnclaim: () => void;
  readonly onQueueRemove: () => void;
}

const MechanicCard = memo(function MechanicCard({
  mechanic,
  canUnclaim,
  canRemove,
  isMechanicMutationLocked,
  isUnclaiming,
  isRemoveDisabled,
  t,
  onUnclaim,
  onQueueRemove,
}: MechanicCardProps) {
  return (
    <div className="rounded-xl border border-arsm-border bg-arsm-toggle-bg/90 px-3 py-2 shadow-[0_6px_16px_rgba(45,36,64,0.06)] dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark/80 dark:shadow-[0_8px_18px_rgba(3,5,14,0.3)]">
      <div className="flex items-center gap-2">
        <MechanicAvatar
          mechanicId={mechanic.id}
          fullName={mechanic.fullName}
          hasProfilePicture={mechanic.hasProfilePicture}
          sizeClassName="h-8 w-8 text-xs"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="break-words text-sm font-medium text-arsm-primary dark:text-arsm-primary-dark">{mechanic.fullName}</span>
            <span className="rounded-full border border-arsm-accent/25 bg-arsm-accent-wash px-2.5 py-0.5 text-xs font-semibold text-arsm-accent-vivid dark:border-arsm-accent-dark/30 dark:bg-arsm-hover-dark dark:text-arsm-accent">
              {mechanic.specialization}
            </span>
          </div>

        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {canUnclaim && (
            <button
              onClick={onUnclaim}
              disabled={isMechanicMutationLocked || isUnclaiming}
              title={t('scheduler.detail.unassignMe')}
              className="inline-flex items-center gap-1 rounded-lg border border-arsm-error-border/70 bg-arsm-error-bg px-2.5 py-1 text-xs font-medium text-arsm-error-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-softest disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-error-dark/70 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{isUnclaiming ? '...' : t('scheduler.detail.unassignMe')}</span>
            </button>
          )}

          {canRemove && (
            <button
              onClick={onQueueRemove}
              disabled={isRemoveDisabled}
              title={t('scheduler.detail.removeMechanic')}
              className="rounded-lg p-1 text-arsm-error-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-bg disabled:cursor-not-allowed disabled:opacity-50 dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
