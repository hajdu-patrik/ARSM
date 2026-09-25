import { memo } from 'react';
import type { TFunction } from 'i18next';
import {
  compactPrimaryValueTextClass,
  defaultBorderToneClass,
  formFieldGridClass,
  insetSurfaceClass,
  intakeDateTimeInputClass,
  intakeFieldLabelClass,
  intakeFieldWrapperClass,
  intakeInputClass,
  relativeOverflowBorderLayoutClass,
  uppercaseMetaLabelTextClass,
} from '../../../../utils/formStyles';
import { filterNameInput, filterPhoneInput } from '../../../../utils/validation';
import { StatusBadge } from '../shared/StatusBadge';

interface SchedulerIntakeHeaderProps {
  readonly selectedDayLabel: string;
  readonly dueDateTime: string;
  readonly translate: TFunction;
  readonly onDueDateTimeChange: (value: string) => void;
}

/** Renders selected-day and due-date controls for scheduler intake. */
export const SchedulerIntakeHeader = memo(function SchedulerIntakeHeader({
  selectedDayLabel,
  dueDateTime,
  translate,
  onDueDateTimeChange,
}: SchedulerIntakeHeaderProps) {
  return (
    <div className="space-y-3">
      <div className={`${relativeOverflowBorderLayoutClass} ${defaultBorderToneClass} bg-arsm-input/90 px-4 py-3 dark:bg-arsm-card-dark ${compactPrimaryValueTextClass}`}>
        <div aria-hidden="true" className="arsm-intake-sheen pointer-events-none absolute inset-x-0 top-0 h-10" />
        <span className="relative font-medium">{translate('scheduler.intake.selectedDay')}</span>
        <span className="relative ml-1">{selectedDayLabel}</span>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3">
        <label className={intakeFieldWrapperClass}>
          <span className={intakeFieldLabelClass}>{translate('scheduler.intake.dueDateTime')}</span>
          <input
            type="datetime-local"
            data-testid="scheduler-intake-due-datetime"
            value={dueDateTime}
            onChange={(event) => onDueDateTimeChange(event.target.value)}
            className={intakeDateTimeInputClass}
          />
        </label>
      </div>

      <div className={`${insetSurfaceClass} p-3.5 text-sm`}>
        <span className="font-medium text-arsm-muted dark:text-arsm-muted-dark">{translate('scheduler.intake.statusLabel')}</span>
        <StatusBadge status="InProgress" className="mt-1" />
      </div>
    </div>
  );
});

interface SchedulerIntakeCustomerFormProps {
  readonly customerEmail: string;
  readonly customerFirstName: string;
  readonly customerMiddleName: string;
  readonly customerLastName: string;
  readonly customerPhone: string;
  readonly translate: TFunction;
  readonly onCustomerEmailChange: (value: string) => void;
  readonly onCustomerFirstNameChange: (value: string) => void;
  readonly onCustomerMiddleNameChange: (value: string) => void;
  readonly onCustomerLastNameChange: (value: string) => void;
  readonly onCustomerPhoneChange: (value: string) => void;
}

/** Renders customer identity fields for scheduler intake. */
export const SchedulerIntakeCustomerForm = memo(function SchedulerIntakeCustomerForm({
  customerEmail,
  customerFirstName,
  customerMiddleName,
  customerLastName,
  customerPhone,
  translate,
  onCustomerEmailChange,
  onCustomerFirstNameChange,
  onCustomerMiddleNameChange,
  onCustomerLastNameChange,
  onCustomerPhoneChange,
}: SchedulerIntakeCustomerFormProps) {
  return (
    <div className={`${insetSurfaceClass} ${formFieldGridClass} p-3.5`}>
      <p className={`${uppercaseMetaLabelTextClass} sm:col-span-2`}>{translate('common.fields.personalInformation')}</p>

      <label className={`${intakeFieldWrapperClass} sm:col-span-2`}>
        <span className={intakeFieldLabelClass}>{translate('scheduler.intake.customerEmail')}</span>
        <input
          type="email"
          data-testid="scheduler-intake-customer-email"
          value={customerEmail}
          onChange={(event) => onCustomerEmailChange(event.target.value)}
          placeholder={translate('scheduler.intake.customerEmailPlaceholder')}
          className={`${intakeInputClass} truncate`}
        />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.firstName')}</span>
        <input
          value={customerFirstName}
          onChange={(event) => onCustomerFirstNameChange(filterNameInput(event.target.value))}
          placeholder={translate('common.placeholders.firstName')}
          className={intakeInputClass}
        />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.middleName')}</span>
        <input
          value={customerMiddleName}
          onChange={(event) => onCustomerMiddleNameChange(filterNameInput(event.target.value))}
          placeholder={translate('scheduler.intake.customerMiddleNamePlaceholder')}
          className={intakeInputClass}
        />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.lastName')}</span>
        <input
          value={customerLastName}
          onChange={(event) => onCustomerLastNameChange(filterNameInput(event.target.value))}
          placeholder={translate('common.placeholders.lastName')}
          className={intakeInputClass}
        />
      </label>

      <label className={intakeFieldWrapperClass}>
        <span className={intakeFieldLabelClass}>{translate('common.fields.phoneNumber')}</span>
        <input
          value={customerPhone}
          onChange={(event) => onCustomerPhoneChange(filterPhoneInput(event.target.value))}
          placeholder={translate('common.placeholders.phone')}
          className={intakeInputClass}
        />
      </label>
    </div>
  );
});
