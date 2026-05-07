import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/common/Modal';

interface AppointmentDetailRemoveMechanicModalProps {
  readonly pendingRemoveMechanic: { id: number; fullName: string } | null;
  readonly removingMechanicId: number | null;
  readonly isCancelled: boolean;
  readonly onClose: () => void;
  readonly onConfirmRemove: (mechanicId: number) => Promise<void>;
}

const AppointmentDetailRemoveMechanicModalComponent = memo(function AppointmentDetailRemoveMechanicModal({
  pendingRemoveMechanic,
  removingMechanicId,
  isCancelled,
  onClose,
  onConfirmRemove,
}: AppointmentDetailRemoveMechanicModalProps) {
  const { t } = useTranslation();

  const isMutationInFlight = removingMechanicId !== null;
  const isConfirmDisabled = isMutationInFlight || isCancelled || pendingRemoveMechanic === null;

  useEffect(() => {
    if (!pendingRemoveMechanic || isMutationInFlight) {
      return;
    }

    if (isCancelled) {
      onClose();
    }
  }, [isCancelled, isMutationInFlight, onClose, pendingRemoveMechanic]);

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemoveMechanic || isConfirmDisabled) {
      return;
    }

    try {
      await onConfirmRemove(pendingRemoveMechanic.id);
      onClose();
    } catch {
      // Error toasts are emitted by the caller action layer.
    }
  }, [isConfirmDisabled, onClose, onConfirmRemove, pendingRemoveMechanic]);

  return (
    <Modal
      isOpen={pendingRemoveMechanic !== null}
      onClose={() => {
        if (!isMutationInFlight) {
          onClose();
        }
      }}
      title={t('scheduler.detail.removeConfirmTitle')}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isMutationInFlight}
            className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition-all duration-200 hover:-translate-y-px hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
          >
            {t('scheduler.intake.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirmRemove();
            }}
            disabled={isConfirmDisabled}
            className="inline-flex items-center justify-center rounded-xl bg-arsm-error-accent px-4 py-2.5 text-sm font-semibold text-arsm-on-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-active disabled:cursor-not-allowed disabled:opacity-60 dark:text-arsm-on-accent-dark"
          >
            {t('scheduler.detail.removeMechanic')}
          </button>
        </>
      )}
    >
      <p className="break-words rounded-xl border border-arsm-border bg-arsm-input/75 px-3.5 py-3 text-sm text-arsm-label [overflow-wrap:anywhere] dark:border-arsm-border-dark dark:bg-arsm-input-dark/70 dark:text-arsm-label-dark">
        {t('scheduler.detail.removeConfirmMessage', { name: pendingRemoveMechanic?.fullName ?? '' })}
      </p>
    </Modal>
  );
});

AppointmentDetailRemoveMechanicModalComponent.displayName = 'AppointmentDetailRemoveMechanicModal';

export const AppointmentDetailRemoveMechanicModal = AppointmentDetailRemoveMechanicModalComponent;
