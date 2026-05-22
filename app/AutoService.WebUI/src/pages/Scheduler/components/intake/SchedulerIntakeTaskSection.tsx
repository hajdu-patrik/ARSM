import { memo } from 'react';
import type { TFunction } from 'i18next';
import { insetSurfaceClass, intakeFieldLabelClass, intakeFieldWrapperClass, intakeTextareaClass } from '../../../../utils/formStyles';

interface SchedulerIntakeTaskSectionProps {
  readonly taskDescription: string;
  readonly translate: TFunction;
  readonly onTaskDescriptionChange: (value: string) => void;
}

/** Renders task-description input for scheduler intake. */
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
          onChange={(event) => onTaskDescriptionChange(event.target.value)}
          placeholder={translate('scheduler.intake.taskDescriptionPlaceholder')}
          maxLength={200}
          rows={4}
          className={`${intakeTextareaClass} min-h-[7rem]`}
        />
      </label>
    </div>
  );
});
