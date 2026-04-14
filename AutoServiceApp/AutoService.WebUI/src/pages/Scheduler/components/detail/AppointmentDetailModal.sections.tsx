/**
 * AppointmentDetailModal.sections.tsx
 *
 * Auto-generated documentation header for this source file.
 */

import { memo } from 'react';
import { Clock3, LogOut, UserPlus, X } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import type { EditFormState } from './AppointmentDetailModal.edit';
import type { DueState } from '../../utils/due-date';
import { inputClassCompact } from '../../../../utils/formStyles';
import { FormErrorMessage } from '../../../../components/common/FormErrorMessage';
import { StatusBadge } from '../shared/StatusBadge';
import { MechanicAvatar } from '../shared/MechanicAvatar';

interface AppointmentDetailBodyProps {
  readonly appointment: AppointmentDto;
  readonly currentMechanicId: number | undefined;
  readonly isAdmin: boolean;
  readonly isEditing: boolean;
  readonly isPastAppointment: boolean;
  readonly editForm: EditFormState | null;
  readonly editErrorKey: string | null;
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

export const AppointmentDetailBody = memo(function AppointmentDetailBody({
  appointment,
  currentMechanicId,
  isAdmin,
  isEditing,
  isPastAppointment,
  editForm,
  editErrorKey,
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
    <div className="flex max-h-[62vh] flex-col gap-4 overflow-x-hidden overflow-y-auto pr-1">
      {editErrorKey && <FormErrorMessage message={editErrorKey} />}

      <HeaderSection
        appointmentStatus={appointment.status}
        isEditing={isEditing}
        isPastAppointment={isPastAppointment}
        scheduledDate={editForm?.scheduledDate ?? ''}
        formattedDate={formattedDate}
        t={t}
        onScheduledDateChange={(value) => onEditField('scheduledDate', value)}
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
        isEditing={isEditing}
        editForm={editForm}
        t={t}
        onEditField={onEditField}
      />

      <TaskSection
        isEditing={isEditing}
        taskDescription={editForm?.taskDescription ?? appointment.taskDescription}
        displayTask={appointment.taskDescription}
        t={t}
        onTaskChange={(value) => onEditField('taskDescription', value)}
      />

      <CustomerSection
        fullName={appointment.vehicle.customer.fullName}
        email={appointment.vehicle.customer.email}
        t={t}
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
  readonly isEditing: boolean;
  readonly isPastAppointment: boolean;
  readonly scheduledDate: string;
  readonly formattedDate: string;
  readonly t: TFunction;
  readonly onScheduledDateChange: (value: string) => void;
}

const HeaderSection = memo(function HeaderSection({
  appointmentStatus,
  isEditing,
  isPastAppointment,
  scheduledDate,
  formattedDate,
  t,
  onScheduledDateChange,
}: HeaderSectionProps) {
  const showScheduledInput = isEditing && !isPastAppointment;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <StatusBadge status={appointmentStatus} />
      {showScheduledInput ? (
        <label className="flex min-w-[18rem] flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
          <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.scheduledDate')}</span>
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={(event) => onScheduledDateChange(event.target.value)}
            className={`${inputClassCompact} px-3 py-2`}
          />
        </label>
      ) : (
        <span className="text-sm text-[#6A627F] dark:text-[#B9B0D3]">{formattedDate}</span>
      )}
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
    <div className={`rounded-xl border px-4 py-3 ${dueState.isOverdue ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30' : 'border-[#D8D2E9] bg-[#EFEBFA] dark:border-[#3A3154] dark:bg-[#241F33]'}`}>
      <div className="flex items-center gap-2 text-sm text-[#6A627F] dark:text-[#B9B0D3]">
        <Clock3 className="h-4 w-4" />
        {t('scheduler.due.label')}
      </div>
      <p className={`mt-1 max-w-full break-words text-base font-bold leading-tight sm:text-lg ${dueState.toneClassName}`}>
        {t(dueState.labelKey, dueState.labelValues)}
      </p>
      <p className="mt-0.5 text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.due.exact', { date: dueDateLabel })}</p>
      {isEditing && (
        <label className="mt-2 flex flex-col gap-1 text-sm text-[#2C2440] dark:text-[#EDE8FA]">
          <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.intake.dueDateTime')}</span>
          <input
            type="datetime-local"
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
  readonly isEditing: boolean;
  readonly editForm: EditFormState | null;
  readonly t: TFunction;
  readonly onEditField: (field: keyof EditFormState, value: string) => void;
}

const VehicleSection = memo(function VehicleSection({ appointment, isEditing, editForm, t, onEditField }: VehicleSectionProps) {
  const { vehicle } = appointment;

  const title = isEditing && editForm
    ? `${editForm.brand || vehicle.brand} ${editForm.model || vehicle.model} (${editForm.year || String(vehicle.year)})`
    : `${vehicle.brand} ${vehicle.model} (${vehicle.year})`;

  return (
    <div>
      <h4 className="mb-2 text-base font-semibold text-[#2C2440] dark:text-[#EDE8FA]">{title}</h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <EditableVehicleRow
          label={t('scheduler.detail.licensePlate')}
          isEditing={isEditing}
          editValue={editForm?.licensePlate ?? ''}
          displayValue={vehicle.licensePlate}
          inputClassName={`${inputClassCompact} font-mono uppercase`}
          displayClassName="truncate text-sm font-mono text-[#2C2440] dark:text-[#EDE8FA]"
          onChange={(value) => onEditField('licensePlate', value.toUpperCase())}
        />

        <EditableVehicleRow
          label={t('scheduler.intake.vehicleBrand')}
          isEditing={isEditing}
          editValue={editForm?.brand ?? ''}
          displayValue={vehicle.brand}
          inputClassName={inputClassCompact}
          displayClassName="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]"
          onChange={(value) => onEditField('brand', value)}
        />

        <EditableVehicleRow
          label={t('scheduler.intake.vehicleModel')}
          isEditing={isEditing}
          editValue={editForm?.model ?? ''}
          displayValue={vehicle.model}
          inputClassName={inputClassCompact}
          displayClassName="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]"
          onChange={(value) => onEditField('model', value)}
        />

        <EditableVehicleRow
          label={t('scheduler.intake.vehicleYear')}
          isEditing={isEditing}
          editValue={editForm?.year ?? ''}
          displayValue={String(vehicle.year)}
          inputType="number"
          min={1886}
          max={2100}
          inputClassName={inputClassCompact}
          displayClassName="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]"
          onChange={(value) => onEditField('year', value)}
        />

        <EditableVehicleRow
          label={t('scheduler.intake.vehicleMileageKm')}
          isEditing={isEditing}
          editValue={editForm?.mileageKm ?? ''}
          displayValue={`${vehicle.mileageKm.toLocaleString()} km`}
          inputType="number"
          min={0}
          max={1000000}
          inputClassName={inputClassCompact}
          displayClassName="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]"
          onChange={(value) => onEditField('mileageKm', value)}
        />

        <EditableVehicleRow
          label={t('scheduler.intake.vehicleEnginePowerHp')}
          isEditing={isEditing}
          editValue={editForm?.enginePowerHp ?? ''}
          displayValue={`${vehicle.enginePowerHp} HP`}
          inputType="number"
          min={0}
          max={50000}
          inputClassName={inputClassCompact}
          displayClassName="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]"
          onChange={(value) => onEditField('enginePowerHp', value)}
        />

        <EditableVehicleRow
          label={t('scheduler.intake.vehicleEngineTorqueNm')}
          isEditing={isEditing}
          editValue={editForm?.engineTorqueNm ?? ''}
          displayValue={`${vehicle.engineTorqueNm} Nm`}
          inputType="number"
          min={0}
          max={50000}
          inputClassName={inputClassCompact}
          displayClassName="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]"
          onChange={(value) => onEditField('engineTorqueNm', value)}
        />
      </div>
    </div>
  );
});

interface EditableVehicleRowProps {
  readonly label: string;
  readonly isEditing: boolean;
  readonly editValue: string;
  readonly displayValue: string;
  readonly inputType?: 'text' | 'number';
  readonly min?: number;
  readonly max?: number;
  readonly inputClassName: string;
  readonly displayClassName: string;
  readonly onChange: (value: string) => void;
}

const EditableVehicleRow = memo(function EditableVehicleRow({
  label,
  isEditing,
  editValue,
  displayValue,
  inputType = 'text',
  min,
  max,
  inputClassName,
  displayClassName,
  onChange,
}: EditableVehicleRowProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[#D8D2E9] bg-[#EFEBFA] px-3 py-2 dark:border-[#3A3154] dark:bg-[#241F33]">
      <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{label}</span>
      {isEditing ? (
        <input
          type={inputType}
          min={min}
          max={max}
          value={editValue}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
        />
      ) : (
        <span className={displayClassName}>{displayValue}</span>
      )}
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
    <div>
      <h4 className="mb-1 text-sm font-medium text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.task')}</h4>
      <div className="rounded-lg border border-[#D8D2E9] bg-[#EFEBFA] px-3 py-2 dark:border-[#3A3154] dark:bg-[#241F33]">
        {isEditing ? (
          <textarea
            value={taskDescription}
            onChange={(event) => onTaskChange(event.target.value)}
            rows={3}
            className={`${inputClassCompact} px-3 py-2 text-[#2C2440] dark:text-[#EDE8FA]`}
          />
        ) : (
          <p className="break-words text-sm text-[#2C2440] dark:text-[#EDE8FA]">{displayTask}</p>
        )}
      </div>
    </div>
  );
});

interface CustomerSectionProps {
  readonly fullName: string;
  readonly email: string;
  readonly t: TFunction;
}

const CustomerSection = memo(function CustomerSection({ fullName, email, t }: CustomerSectionProps) {
  return (
    <div>
      <h4 className="mb-1 text-sm font-medium text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.customer')}</h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[#D8D2E9] bg-[#EFEBFA] px-3 py-2 dark:border-[#3A3154] dark:bg-[#241F33]">
          <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.customerName')}</span>
          <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]" title={fullName}>{fullName}</span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[#D8D2E9] bg-[#EFEBFA] px-3 py-2 dark:border-[#3A3154] dark:bg-[#241F33]">
          <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.customerEmail')}</span>
          <span className="truncate text-sm text-[#2C2440] dark:text-[#EDE8FA]" title={email}>{email}</span>
        </div>
      </div>
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
  return (
    <div>
      <h4 className="mb-1 text-sm font-medium text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.mechanics')}</h4>
      {appointment.mechanics.length === 0 ? (
        <p className="text-sm italic text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.detail.noMechanics')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {appointment.mechanics.map((mechanic) => (
            <MechanicCard
              key={mechanic.id}
              mechanic={mechanic}
              canUnclaim={!isClosedForMechanicMutations && !isAdmin && currentMechanicId !== undefined && mechanic.id === currentMechanicId}
              canRemove={!isClosedForMechanicMutations && isAdmin && appointment.mechanics.length > 1}
              isUnclaiming={isUnclaiming}
              isRemoveDisabled={removingMechanicId === mechanic.id || isClosedForMechanicMutations}
              t={t}
              onUnclaim={onUnclaim}
              onQueueRemove={() => onQueueRemoveMechanic({ id: mechanic.id, fullName: mechanic.fullName })}
            />
          ))}
        </div>
      )}

      {isAdmin && !isClosedForMechanicMutations && (
        <div className="mt-3">
          <h5 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-[#6A627F] dark:text-[#B9B0D3]">
            <UserPlus className="h-3.5 w-3.5" />
            {t('scheduler.detail.addMechanic')}
          </h5>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedNewMechanicId}
              onChange={(event) => onSelectNewMechanic(event.target.value)}
              aria-label={t('scheduler.detail.selectMechanic')}
              className="w-full min-w-0 rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1.5 text-sm text-[#2C2440] focus:outline-none disabled:opacity-50 dark:border-[#3A3154] dark:bg-[#1A1A25] dark:text-[#EDE8FA] sm:flex-1"
            >
              <option value="">{t('scheduler.detail.selectMechanic')}</option>
              {availableMechanics.map((mechanic) => {
                const name = [mechanic.firstName, mechanic.middleName, mechanic.lastName].filter(Boolean).join(' ');
                return (
                  <option key={mechanic.personId} value={mechanic.personId}>{name}</option>
                );
              })}
            </select>
            <button
              onClick={onAdminAssign}
              disabled={isAssigning || !selectedNewMechanicId}
              className="w-full shrink-0 rounded-lg bg-[#C9B3FF] px-3 py-1.5 text-sm font-medium text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6] sm:w-auto"
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
  isUnclaiming,
  isRemoveDisabled,
  t,
  onUnclaim,
  onQueueRemove,
}: MechanicCardProps) {
  return (
    <div className="rounded-lg border border-[#D8D2E9] bg-[#EFEBFA] px-3 py-2 dark:border-[#3A3154] dark:bg-[#241F33]">
      <div className="flex items-start gap-2">
        <MechanicAvatar
          mechanicId={mechanic.id}
          fullName={mechanic.fullName}
          hasProfilePicture={mechanic.hasProfilePicture}
          sizeClassName="h-8 w-8 text-xs"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="break-words text-sm font-medium text-[#2C2440] dark:text-[#EDE8FA]">{mechanic.fullName}</span>
            <span className="rounded-full bg-[#D8D2E9] px-2 py-0.5 text-xs text-[#2C2440] dark:bg-[#3A3154] dark:text-[#EDE8FA]">
              {mechanic.specialization}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {mechanic.expertise.map((expertise) => (
              <span
                key={expertise}
                className="max-w-full break-all rounded-full bg-[#C9B3FF]/30 px-2 py-0.5 text-xs text-[#5E5672] dark:bg-[#7A66C7]/30 dark:text-[#CFC5EA]"
              >
                {expertise}
              </span>
            ))}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-start gap-1">
          {canUnclaim && (
            <button
              onClick={onUnclaim}
              disabled={isUnclaiming}
              title={t('scheduler.detail.unassignMe')}
              className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
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
              className="rounded-lg p-1 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
