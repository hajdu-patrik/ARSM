import { memo } from 'react';
import { Clock3 } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import type { EditFormState } from './AppointmentDetailModal.edit';
import type { DueState } from '../../utils/due-date';
import {
  inputClassCompact,
  schedulerDetailPanelClass,
  schedulerDetailRowClass,
} from '../../../../utils/formStyles';
import { StatusBadge } from '../shared/StatusBadge';
import { MechanicsSection, type MechanicOption } from './AppointmentDetailModal.mechanics';

interface AppointmentDetailBodyProps {
  readonly appointment: AppointmentDto;
  readonly isAdmin: boolean;
  readonly isEditing: boolean;
  readonly editForm: EditFormState | null;
  readonly formattedDate: string;
  readonly dueDateLabel: string;
  readonly dueState: DueState;
  readonly availableMechanics: MechanicOption[];
  readonly selectedNewMechanicId: string;
  readonly canClaim: boolean;
  readonly canUnclaim: boolean;
  readonly isClaiming: boolean;
  readonly isAssigning: boolean;
  readonly isClosedForMechanicMutations: boolean;
  readonly isUnclaiming: boolean;
  readonly t: TFunction;
  readonly currentMechanicId: number | undefined;
  readonly onEditField: (field: keyof EditFormState, value: string) => void;
  readonly onClaim: () => void;
  readonly onUnclaim: () => void;
  readonly onSelectNewMechanic: (value: string) => void;
  readonly onAdminAssign: () => void;
  readonly onAdminUnassign: (mechanicId: number) => void;
}

/**
 * Renders the appointment detail modal body sections and wires section-level callbacks.
 * Handles edit-mode rendering and mechanic mutation controls without owning modal state.
 */
export const AppointmentDetailBody = memo(function AppointmentDetailBody({
  appointment,
  isAdmin,
  isEditing,
  editForm,
  formattedDate,
  dueDateLabel,
  dueState,
  availableMechanics,
  selectedNewMechanicId,
  canClaim,
  canUnclaim,
  isClaiming,
  isAssigning,
  isClosedForMechanicMutations,
  isUnclaiming,
  t,
  currentMechanicId,
  onEditField,
  onClaim,
  onUnclaim,
  onSelectNewMechanic,
  onAdminAssign,
  onAdminUnassign,
}: AppointmentDetailBodyProps) {
  return (
    <div className="flex min-w-0 max-h-[62vh] flex-col gap-4 overflow-x-hidden overflow-y-auto pb-0.5 pr-1">
      <HeaderSection appointmentStatus={appointment.status} formattedDate={formattedDate} />
      <DueSection
        dueState={dueState}
        dueDateLabel={dueDateLabel}
        isEditing={isEditing}
        dueDateTime={editForm?.dueDateTime ?? ''}
        t={t}
        onDueDateTimeChange={(value) => onEditField('dueDateTime', value)}
      />
      <VehicleSection appointment={appointment} t={t} />
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
          isAdmin={isAdmin}
          isClaiming={isClaiming}
          isAssigning={isAssigning}
          isClosedForMechanicMutations={isClosedForMechanicMutations}
          isUnclaiming={isUnclaiming}
          availableMechanics={availableMechanics}
          selectedNewMechanicId={selectedNewMechanicId}
          currentMechanicId={currentMechanicId}
          canClaim={canClaim}
          canUnclaim={canUnclaim}
          t={t}
          onClaim={onClaim}
          onUnclaim={onUnclaim}
          onSelectNewMechanic={onSelectNewMechanic}
          onAdminAssign={onAdminAssign}
          onAdminUnassign={onAdminUnassign}
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
    <div className={`${schedulerDetailRowClass} px-3.5 py-2.5`}>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <StatusBadge status={appointmentStatus} />
        <span className="truncate text-sm text-arsm-muted dark:text-arsm-muted-dark">{formattedDate}</span>
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
    <div
      className={`rounded-2xl border px-4 py-3 ${
        dueState.isOverdue
          ? 'border-arsm-error-border bg-arsm-error-bg dark:border-arsm-error-dark/80 dark:bg-arsm-error-bg-dark'
          : 'border-arsm-border bg-arsm-toggle-bg dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm text-arsm-muted dark:text-arsm-muted-dark">
        <Clock3 className="h-4 w-4 shrink-0" />
        {t('scheduler.due.label')}
      </div>
      <p
        className={`mt-1 max-w-full break-words text-base font-bold leading-tight sm:text-lg ${dueState.toneClassName}`}
      >
        {t(dueState.labelKey, dueState.labelValues)}
      </p>
      <p className="mt-0.5 text-xs text-arsm-muted dark:text-arsm-muted-dark">
        {t('scheduler.due.exact', { date: dueDateLabel })}
      </p>
      {isEditing && (
        <label className="mt-2 flex flex-col gap-1 text-sm text-arsm-primary dark:text-arsm-primary-dark">
          <span className="text-xs text-arsm-muted dark:text-arsm-muted-dark">
            {t('scheduler.intake.dueDateTime')}
          </span>
          <input
            type="datetime-local"
            data-testid="appointment-detail-due-datetime"
            value={dueDateTime}
            onChange={(event) => onDueDateTimeChange(event.target.value)}
            className={`${inputClassCompact} min-h-11 px-3 py-2`}
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
    <div className={schedulerDetailPanelClass}>
      <h4 className="mb-2 min-w-0 break-words text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">
        {title}
      </h4>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
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
  const valueClassName = ['min-w-0', displayClassName].join(' ');

  return (
    <div className={`${schedulerDetailRowClass} flex min-w-0 items-center justify-between gap-3`}>
      <span className="shrink-0 text-xs text-arsm-muted dark:text-arsm-muted-dark">{label}</span>
      <span className={valueClassName}>{displayValue}</span>
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

const TaskSection = memo(function TaskSection({
  isEditing,
  taskDescription,
  displayTask,
  t,
  onTaskChange,
}: TaskSectionProps) {
  return (
    <div className={schedulerDetailPanelClass}>
      <h4 className="mb-2 text-sm font-medium text-arsm-muted dark:text-arsm-muted-dark">
        {t('scheduler.detail.task')}
      </h4>
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

