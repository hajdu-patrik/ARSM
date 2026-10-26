/** Section components for the appointment detail modal body (header, due date, vehicle, task). */
import { memo } from 'react';
import { Clock3, FileText } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import type { EditFormState } from './AppointmentDetailModal.edit';
import type { DueState } from '../../utils/due-date';
import {
  baseSectionHeadingTextClass,
  compactChipNeutralButtonClass,
  compactPrimaryValueTextClass,
  compactStackedRowClass,
  compactTwoColumnGridClass,
  defaultIconClass,
  inputClassCompact,
  mutedMetaTextClass,
  mutedSecondaryTextClass,
  schedulerDetailPanelClass,
  schedulerDetailRowClass,
  smallIconClass,
  textareaClass,
  toneFeedbackClasses,
} from '../../../../utils/formStyles';
import { formatQuantity } from '../../../../utils/number';
import { StatusBadge } from '../shared/StatusBadge';
import { MechanicsSection, type MechanicOption } from './AppointmentDetailModal.mechanics';

interface AppointmentDetailBodyProps {
  readonly appointment: AppointmentDto;
  readonly isAdmin: boolean;
  readonly isEditing: boolean;
  readonly editForm: EditFormState;
  readonly formattedDate: string;
  readonly dueDateLabel: string;
  readonly dueState: DueState;
  readonly quoteId: number | null;
  readonly availableMechanics: MechanicOption[];
  readonly selectedNewMechanicId: string;
  readonly canClaim: boolean;
  readonly canUnclaim: boolean;
  readonly isClaiming: boolean;
  readonly isAssigning: boolean;
  readonly isClosedForMechanicMutations: boolean;
  readonly isUnclaiming: boolean;
  readonly t: TFunction;
  readonly locale: string;
  readonly currentMechanicId: number | undefined;
  readonly onEditField: (field: keyof EditFormState, value: string) => void;
  readonly onOpenQuote: () => void;
  readonly onClaim: () => void;
  readonly onUnclaim: () => void;
  readonly onSelectNewMechanic: (value: string) => void;
  readonly onAdminAssign: () => void;
  readonly onAdminUnassign: (mechanicId: number) => void;
}

/** Renders the appointment detail modal body sections and wires section-level callbacks; owns no modal state. */
export const AppointmentDetailBody = memo(function AppointmentDetailBody({
  appointment,
  isAdmin,
  isEditing,
  editForm,
  formattedDate,
  dueDateLabel,
  dueState,
  quoteId,
  availableMechanics,
  selectedNewMechanicId,
  canClaim,
  canUnclaim,
  isClaiming,
  isAssigning,
  isClosedForMechanicMutations,
  isUnclaiming,
  t,
  locale,
  currentMechanicId,
  onEditField,
  onOpenQuote,
  onClaim,
  onUnclaim,
  onSelectNewMechanic,
  onAdminAssign,
  onAdminUnassign,
}: AppointmentDetailBodyProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto pb-0.5 pr-1">
      <HeaderSection appointmentStatus={appointment.status} formattedDate={formattedDate} />
      <DueSection
        dueState={dueState}
        dueDateLabel={dueDateLabel}
        isEditing={isEditing}
        dueDateTime={editForm.dueDateTime}
        quoteId={quoteId}
        t={t}
        onOpenQuote={onOpenQuote}
        onDueDateTimeChange={(value) => {
          onEditField('dueDateTime', value);
        }}
      />
      <VehicleSection appointment={appointment} t={t} locale={locale} />
      <TaskSection
        isEditing={isEditing}
        taskDescription={editForm.taskDescription}
        displayTask={appointment.taskDescription}
        t={t}
        onTaskChange={(value) => {
          onEditField('taskDescription', value);
        }}
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

/** Status badge and formatted scheduled date of the appointment. */
const HeaderSection = memo(function HeaderSection({
  appointmentStatus,
  formattedDate,
}: HeaderSectionProps) {
  return (
    <div className={schedulerDetailRowClass}>
      <div className={compactStackedRowClass}>
        <StatusBadge status={appointmentStatus} className="self-start sm:self-auto" />
        <span className={`min-w-0 [overflow-wrap:anywhere] ${mutedSecondaryTextClass}`}>{formattedDate}</span>
      </div>
    </div>
  );
});

interface DueSectionProps {
  readonly dueState: DueState;
  readonly dueDateLabel: string;
  readonly isEditing: boolean;
  readonly dueDateTime: string;
  readonly quoteId: number | null;
  readonly t: TFunction;
  readonly onOpenQuote: () => void;
  readonly onDueDateTimeChange: (value: string) => void;
}

/** Due state of the appointment; in edit mode it also holds the due moment input. */
const DueSection = memo(function DueSection({
  dueState,
  dueDateLabel,
  isEditing,
  dueDateTime,
  quoteId,
  t,
  onOpenQuote,
  onDueDateTimeChange,
}: DueSectionProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 max-[320px]:px-3 ${
        dueState.isOverdue
          ? toneFeedbackClasses.error
          : 'border-ui-border bg-ui-toggle'
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className={`flex min-w-0 items-center gap-2 ${mutedSecondaryTextClass}`}>
          <Clock3 className={defaultIconClass} />
          {t('scheduler.due.label')}
        </div>
        {quoteId !== null && !isEditing && (
          <button
            type="button"
            data-testid="appointment-detail-open-quote"
            className={compactChipNeutralButtonClass}
            title={t('common.actions.openQuote')}
            aria-label={t('common.actions.openQuote')}
            onClick={onOpenQuote}
          >
            <FileText className={smallIconClass} />
            {t('common.actions.openQuote')}
          </button>
        )}
      </div>
      <p
        className={`mt-1 max-w-full break-words text-base font-bold leading-tight sm:text-lg ${dueState.toneClassName}`}
      >
        {dueState.labelValues === undefined
          ? t(dueState.labelKey)
          : t(dueState.labelKey, dueState.labelValues)}
      </p>
      <p className={`mt-0.5 ${mutedMetaTextClass}`}>
        {t('scheduler.due.exact', { date: dueDateLabel })}
      </p>
      {isEditing && (
        <label className={`mt-2 flex flex-col gap-1 ${compactPrimaryValueTextClass}`}>
          <span className={mutedMetaTextClass}>
            {t('scheduler.intake.dueDateTime')}
          </span>
          <input
            type="datetime-local"
            data-testid="appointment-detail-due-datetime"
            value={dueDateTime}
            onChange={(event) => {
              onDueDateTimeChange(event.target.value);
            }}
            className={inputClassCompact}
          />
        </label>
      )}
    </div>
  );
});

interface VehicleSectionProps {
  readonly appointment: AppointmentDto;
  readonly t: TFunction;
  readonly locale: string;
}

/** Read-only vehicle details of the appointment. */
const VehicleSection = memo(function VehicleSection({ appointment, t, locale }: VehicleSectionProps) {
  const { vehicle } = appointment;
  const title = `${vehicle.brand} ${vehicle.model} (${String(vehicle.year)})`;

  return (
    <div className={schedulerDetailPanelClass}>
      <h3 className={`mb-2 min-w-0 break-words ${baseSectionHeadingTextClass}`}>
        {title}
      </h3>
      <div className={compactTwoColumnGridClass}>
        <VehicleValueRow
          label={t('common.fields.licensePlate')}
          displayValue={vehicle.licensePlate}
          displayClassName={`font-mono ${compactPrimaryValueTextClass}`}
        />
        <VehicleValueRow
          label={t('common.fields.vin')}
          displayValue={vehicle.vin}
          displayClassName={`font-mono ${compactPrimaryValueTextClass}`}
        />
        <VehicleValueRow
          label={t('common.fields.brand')}
          displayValue={vehicle.brand}
          displayClassName={compactPrimaryValueTextClass}
        />
        <VehicleValueRow
          label={t('common.fields.model')}
          displayValue={vehicle.model}
          displayClassName={compactPrimaryValueTextClass}
        />
        <VehicleValueRow
          label={t('common.fields.vehicleYear')}
          displayValue={String(vehicle.year)}
          displayClassName={compactPrimaryValueTextClass}
        />
        <VehicleValueRow
          label={t('common.fields.mileageKm')}
          displayValue={`${formatQuantity(vehicle.mileageKm, locale)} km`}
          displayClassName={compactPrimaryValueTextClass}
        />
        <VehicleValueRow
          label={t('common.fields.enginePowerKw')}
          displayValue={`${String(vehicle.enginePowerKw)} kW`}
          displayClassName={compactPrimaryValueTextClass}
        />
        <VehicleValueRow
          label={t('common.fields.drivetrain')}
          displayValue={t(`vehicle.drivetrain.${vehicle.drivetrainType}`)}
          displayClassName={compactPrimaryValueTextClass}
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

/** Label/value row whose value wraps under the label when it does not fit beside it, so no value is ever ellipsized. */
const VehicleValueRow = memo(function VehicleValueRow({
  label,
  displayValue,
  displayClassName,
}: VehicleValueRowProps) {
  const valueClassName = ['min-w-0 [overflow-wrap:anywhere]', displayClassName].join(' ');

  return (
    <div className={`${schedulerDetailRowClass} flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-0.5`}>
      <span className={`min-w-0 ${mutedMetaTextClass}`}>{label}</span>
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

/** Task description, shown as text or, in edit mode, as a textarea. */
const TaskSection = memo(function TaskSection({
  isEditing,
  taskDescription,
  displayTask,
  t,
  onTaskChange,
}: TaskSectionProps) {
  return (
    <div className={schedulerDetailPanelClass}>
      <h3 className={`mb-2 font-medium ${mutedSecondaryTextClass}`}>
        {t('scheduler.intake.taskDescription')}
      </h3>
      {isEditing ? (
        <textarea
          value={taskDescription}
          onChange={(event) => {
            onTaskChange(event.target.value);
          }}
          rows={3}
          className={textareaClass}
        />
      ) : (
        <p className={`break-words ${compactPrimaryValueTextClass}`}>{displayTask}</p>
      )}
    </div>
  );
});

