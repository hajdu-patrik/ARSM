import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SchedulerCreateIntakeRequest } from '../../../../types/scheduler/scheduler.types';
import { FormErrorMessage } from '../../../../components/common/FormErrorMessage';
import { Modal } from '../../../../components/common/Modal';
import { formatLongDate } from '../../utils/scheduler-datetime';
import { useSchedulerIntakeForm } from '../../hooks/useSchedulerIntakeForm';
import {
  SchedulerIntakeCustomerForm,
  SchedulerIntakeHeader,
  SchedulerIntakeLookupSection,
  SchedulerIntakeTaskSection,
  SchedulerIntakeVehicleForm,
  SchedulerIntakeVehicleModeSection,
} from './SchedulerIntakeSections';

interface SchedulerIntakeModalProps {
  readonly isOpen: boolean;
  readonly selectedDate: Date;
  readonly onClose: () => void;
  readonly onSubmit: (request: SchedulerCreateIntakeRequest) => Promise<void>;
}

const SchedulerIntakeModalComponent = memo(function SchedulerIntakeModal({
  isOpen,
  selectedDate,
  onClose,
  onSubmit,
}: SchedulerIntakeModalProps) {
  const { t, i18n } = useTranslation();
  const { state, derived, actions } = useSchedulerIntakeForm({
    isOpen,
    selectedDate,
    onClose,
    onSubmit,
  });

  const selectedDayLabel = useMemo(() => {
    return formatLongDate(selectedDate, i18n.language);
  }, [i18n.language, selectedDate]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('scheduler.intake.title')}
      widthClassName="max-w-4xl"
      footer={state.lookupState === 'idle'
        ? null
        : (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-arsm-border px-4 py-2 text-sm font-medium text-arsm-primary transition-colors hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:text-arsm-primary-dark dark:hover:bg-arsm-hover-dark"
            >
              {t('scheduler.intake.cancel')}
            </button>
            <button
              type="button"
              data-testid="scheduler-intake-create"
              onClick={() => {
                actions.handleCreate();
              }}
              disabled={state.isSubmitting}
              className="rounded-lg bg-arsm-accent px-4 py-2 text-sm font-semibold text-arsm-primary transition-colors hover:bg-arsm-accent-hover disabled:opacity-50 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
            >
              {state.isSubmitting ? t('scheduler.intake.creating') : t('scheduler.intake.create')}
            </button>
          </div>
        )}
    >
      <div className="max-h-[64vh] space-y-4 overflow-y-auto pr-1">
        <SchedulerIntakeHeader
          selectedDayLabel={selectedDayLabel}
          dueDateTime={state.dueDateTime}
          t={t}
          onDueDateTimeChange={actions.setDueDateTime}
        />

        <SchedulerIntakeLookupSection
          lookupState={state.lookupState}
          customerLookup={state.customerLookup}
          email={state.email}
          isSearching={state.isSearching}
          t={t}
          onEmailChange={actions.handleEmailChange}
          onLookup={() => {
            actions.handleLookup();
          }}
        />

        {derived.shouldShowCustomerCreate && (
          <SchedulerIntakeCustomerForm
            customerFirstName={state.customerFirstName}
            customerMiddleName={state.customerMiddleName}
            customerLastName={state.customerLastName}
            customerPhone={state.customerPhone}
            t={t}
            onCustomerFirstNameChange={actions.setCustomerFirstName}
            onCustomerMiddleNameChange={actions.setCustomerMiddleName}
            onCustomerLastNameChange={actions.setCustomerLastName}
            onCustomerPhoneChange={actions.setCustomerPhone}
          />
        )}

        {state.lookupState === 'found' && (
          <SchedulerIntakeVehicleModeSection
            customerLookup={state.customerLookup}
            customerHasVehicles={derived.customerHasVehicles}
            vehicleMode={state.vehicleMode}
            existingVehicleId={state.existingVehicleId}
            t={t}
            onVehicleModeChange={actions.setVehicleMode}
            onExistingVehicleIdChange={actions.setExistingVehicleId}
          />
        )}

        {derived.shouldShowVehicleCreate && (
          <SchedulerIntakeVehicleForm
            vehicle={state.vehicle}
            t={t}
            onVehicleFieldChange={actions.handleVehicleField}
          />
        )}

        {state.lookupState !== 'idle' && (
          <SchedulerIntakeTaskSection
            taskDescription={state.taskDescription}
            t={t}
            onTaskDescriptionChange={actions.setTaskDescription}
          />
        )}

        <FormErrorMessage message={state.errorKey} className="mt-2" />
      </div>
    </Modal>
  );
});

SchedulerIntakeModalComponent.displayName = 'SchedulerIntakeModal';

export const SchedulerIntakeModal = SchedulerIntakeModalComponent;
