import { memo, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SchedulerCreateIntakeRequest } from '../../../../types/scheduler/scheduler.types';
import { Modal } from '../../../../components/common/Modal';
import { useToastStore } from '../../../../store/toast.store';
import { formatLongDate } from '../../utils/scheduler-datetime';
import { useSchedulerIntakeForm } from '../../hooks/useSchedulerIntakeForm';
import { buttonClass, secondaryButtonClass } from '../../../../utils/formStyles';
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
  const showErrorToast = useToastStore((state) => state.showError);
  const { state, derived, actions } = useSchedulerIntakeForm({
    isOpen,
    selectedDate,
    onClose,
    onSubmit,
  });

  useEffect(() => {
    if (!state.errorKey) {
      return;
    }

    showErrorToast(state.errorKey);
  }, [showErrorToast, state.errorKey]);

  const selectedDayLabel = useMemo(() => {
    return formatLongDate(selectedDate, i18n.language);
  }, [i18n.language, selectedDate]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('scheduler.intake.title')}
      widthClassName="max-w-2xl"
      footer={state.lookupState === 'idle'
        ? null
        : (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`${secondaryButtonClass} w-full sm:w-auto`}
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
              className={`${buttonClass} w-full sm:w-auto`}
            >
              {state.isSubmitting ? t('scheduler.intake.creating') : t('scheduler.intake.create')}
            </button>
          </div>
        )}
    >
      <div className="max-h-[64vh] space-y-3 overflow-y-auto pr-1 pb-0.5">
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
      </div>
    </Modal>
  );
});

SchedulerIntakeModalComponent.displayName = 'SchedulerIntakeModal';

export const SchedulerIntakeModal = SchedulerIntakeModalComponent;
