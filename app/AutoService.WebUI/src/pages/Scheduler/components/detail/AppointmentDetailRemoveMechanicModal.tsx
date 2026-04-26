import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/common/Modal';

interface AppointmentDetailRemoveMechanicModalProps {
  readonly pendingRemoveMechanic: { id: number; fullName: string } | null;
  readonly removingMechanicId: number | null;
  readonly isCancelled: boolean;
  readonly onClose: () => void;
  readonly onConfirmRemove: (mechanicId: number) => Promise<void>;
}

export const AppointmentDetailRemoveMechanicModal = memo(function AppointmentDetailRemoveMechanicModal({
  pendingRemoveMechanic,
  removingMechanicId,
  isCancelled,
  onClose,
  onConfirmRemove,
}: AppointmentDetailRemoveMechanicModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={pendingRemoveMechanic !== null}
      onClose={() => {
        if (removingMechanicId === null) {
          onClose();
        }
      }}
      title={t('scheduler.detail.removeConfirmTitle')}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={removingMechanicId !== null}
            className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
          >
            {t('scheduler.intake.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!pendingRemoveMechanic) {
                return;
              }

              void onConfirmRemove(pendingRemoveMechanic.id).then(() => {
                onClose();
              });
            }}
            disabled={removingMechanicId !== null || isCancelled}
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
          >
            {t('scheduler.detail.removeMechanic')}
          </button>
        </>
      )}
    >
      <p className="break-words text-sm text-arsm-label [overflow-wrap:anywhere] dark:text-arsm-label-dark">
        {t('scheduler.detail.removeConfirmMessage', {
          name: pendingRemoveMechanic?.fullName ?? '',
        })}
      </p>
    </Modal>
  );
});
