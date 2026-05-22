import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../../../components/common/Modal';
import { mutedBodyTextClass, referenceChipDangerButtonClass, referenceChipNeutralButtonClass } from '../../../../utils/formStyles';

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
      variant="confirm"
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isMutationInFlight}
            className={referenceChipNeutralButtonClass}
          >
            {t('scheduler.intake.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirmRemove();
            }}
            disabled={isConfirmDisabled}
            className={referenceChipDangerButtonClass}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>{t('scheduler.detail.removeMechanic')}</span>
          </button>
        </>
      )}
    >
      <p className={`break-words rounded-xl border border-arsm-border bg-arsm-input/75 px-3.5 py-3 [overflow-wrap:anywhere] dark:border-arsm-border-dark dark:bg-arsm-input-dark/70 ${mutedBodyTextClass}`}>
        {t('scheduler.detail.removeConfirmMessage', { name: pendingRemoveMechanic?.fullName ?? '' })}
      </p>
    </Modal>
  );
});

AppointmentDetailRemoveMechanicModalComponent.displayName = 'AppointmentDetailRemoveMechanicModal';

export const AppointmentDetailRemoveMechanicModal = AppointmentDetailRemoveMechanicModalComponent;
