import { memo } from 'react';
import type { TFunction } from 'i18next';
import { TASK_DESCRIPTION_MAX_LENGTH } from '../detail/AppointmentDetailModal.edit';
import { insetSurfaceClass, intakeFieldLabelClass, intakeFieldWrapperClass, textareaClass } from '../../../../utils/formStyles';

interface SchedulerIntakeTaskSectionProps {
  readonly taskDescription: string;
  readonly translate: TFunction;
  readonly onTaskDescriptionChange: (value: string) => void;
}

/** Intake section with the task description textarea, capped at the shared detail-modal limit. */
export const SchedulerIntakeTaskSection = memo(function SchedulerIntakeTaskSection({
  taskDescription,
  translate,
  onTaskDescriptionChange,
}: SchedulerIntakeTaskSectionProps) {
  return (
    <div className={`${insetSurfaceClass} space-y-3 p-3.5`}>
      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.taskDescription')}</span>
        <textarea
          data-testid="scheduler-intake-task-description"
          value={taskDescription}
          onChange={(event) => {
            onTaskDescriptionChange(event.target.value);
          }}
          placeholder={translate('scheduler.intake.taskDescriptionPlaceholder')}
          maxLength={TASK_DESCRIPTION_MAX_LENGTH}
          rows={4}
          className={textareaClass}
        />
      </label>
    </div>
  );
});
