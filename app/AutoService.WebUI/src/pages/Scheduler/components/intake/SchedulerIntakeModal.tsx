/** Scheduler intake modal: customer lookup, vehicle choice and task for a new appointment on the selected day. */
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
  SchedulerIntakeTaskSection,
  SchedulerIntakeVehicleForm,
  SchedulerIntakeVehicleModeSection,
} from './SchedulerIntakeSections';
import { SchedulerIntakeLookupSection } from './SchedulerIntakeLookupSection';

interface SchedulerIntakeModalProps {
  readonly isOpen: boolean;
  readonly selectedDate: Date;
  readonly onClose: () => void;
  readonly onSubmit: (request: SchedulerCreateIntakeRequest) => Promise<void>;
}

type SchedulerIntakeDialogProps = Omit<SchedulerIntakeModalProps, 'isOpen'>;

/** The open intake dialog; it owns the form state, so every opening starts from an empty form. */
function SchedulerIntakeDialog({ selectedDate, onClose, onSubmit }: SchedulerIntakeDialogProps) {
  const { t: translate, i18n } = useTranslation();
  const showErrorToast = useToastStore((state) => state.showError);
  const { state, derived, actions } = useSchedulerIntakeForm({
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
      isOpen
      onClose={onClose}
      title={translate('scheduler.intake.title')}
      widthClassName="max-w-2xl"
      footer={derived.canCreateIntake
        ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`${secondaryButtonClass} w-full sm:w-auto`}
            >
              {translate('common.actions.cancel')}
            </button>
            <button
              type="button"
              data-testid="scheduler-intake-create"
              onClick={actions.handleCreate}
              disabled={state.isSubmitting}
              className={`${buttonClass} w-full sm:w-auto`}
            >
              {state.isSubmitting ? translate('scheduler.intake.creating') : translate('scheduler.intake.create')}
            </button>
          </div>
        )
        : null}
    >
      <div className="max-h-[64vh] space-y-3 overflow-y-auto pr-1 pb-0.5">
        <SchedulerIntakeHeader
          selectedDayLabel={selectedDayLabel}
          dueDateTime={state.dueDateTime}
          translate={translate}
          onDueDateTimeChange={actions.setDueDateTime}
        />

        <SchedulerIntakeLookupSection
          lookupMode={state.lookupMode}
          lookupState={state.lookupState}
          customerLookup={state.customerLookup}
          nameLookupResults={state.nameLookupResults}
          licensePlateLookup={state.licensePlateLookup}
          nameLookup={state.nameLookup}
          isSearching={state.isSearching}
          translate={translate}
          onLicensePlateLookupChange={actions.handleLicensePlateLookupChange}
          onNameLookupChange={actions.handleNameLookupChange}
          onSelectNameLookupResult={actions.handleSelectNameLookupResult}
        />

        {derived.shouldShowCustomerCreate && (
          <SchedulerIntakeCustomerForm
            customerEmail={state.email}
            customerFirstName={state.customerFirstName}
            customerMiddleName={state.customerMiddleName}
            customerLastName={state.customerLastName}
            customerPhone={state.customerPhone}
            translate={translate}
            onCustomerEmailChange={actions.handleEmailChange}
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
            translate={translate}
            onVehicleModeChange={actions.setVehicleMode}
            onExistingVehicleIdChange={actions.setExistingVehicleId}
          />
        )}

        {derived.shouldShowVehicleCreate && (
          <SchedulerIntakeVehicleForm
            vehicle={state.vehicle}
            translate={translate}
            onVehicleFieldChange={actions.handleVehicleField}
          />
        )}

        {derived.canCreateIntake && (
          <SchedulerIntakeTaskSection
            taskDescription={state.taskDescription}
            translate={translate}
            onTaskDescriptionChange={actions.setTaskDescription}
          />
        )}
      </div>
    </Modal>
  );
}

/** Intake modal; the dialog mounts only while open and is keyed by the selected day. */
export const SchedulerIntakeModal = memo(function SchedulerIntakeModal({
  isOpen,
  selectedDate,
  onClose,
  onSubmit,
}: SchedulerIntakeModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <SchedulerIntakeDialog
      key={selectedDate.getTime()}
      selectedDate={selectedDate}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
});
