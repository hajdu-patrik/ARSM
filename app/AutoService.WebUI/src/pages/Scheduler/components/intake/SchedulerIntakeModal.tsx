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
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition-all duration-200 hover:-translate-y-px hover:bg-arsm-toggle-bg hover:shadow-[0_6px_16px_rgba(45,36,64,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:shadow-[0_6px_16px_rgba(3,5,14,0.28)] dark:focus-visible:ring-arsm-focus-ring/24"
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
              className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-4 py-2 text-sm font-semibold text-arsm-primary shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_14px_28px_rgba(111,84,173,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_12px_24px_rgba(8,10,20,0.5)] dark:hover:bg-arsm-accent-dark-hover dark:hover:shadow-[0_16px_30px_rgba(8,10,20,0.58)] dark:focus-visible:ring-arsm-focus-ring/24"
            >
              {state.isSubmitting ? t('scheduler.intake.creating') : t('scheduler.intake.create')}
            </button>
          </div>
        )}
    >
      <div className="max-h-[64vh] space-y-4 overflow-y-auto pr-1 pb-0.5">
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
