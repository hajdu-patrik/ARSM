/**
 * AppointmentDetailRemoveMechanicModal.tsx
 *
 * Auto-generated documentation header for this source file.
 */

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
            className="inline-flex items-center justify-center rounded-xl border border-[#D8D2E9] bg-transparent px-4 py-2 text-sm font-medium text-[#5E5672] transition hover:bg-[#EFEBFA] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#3A3154] dark:text-[#CFC5EA] dark:hover:bg-[#241F33]"
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
      <p className="break-words text-sm text-[#5E5672] [overflow-wrap:anywhere] dark:text-[#CFC5EA]">
        {t('scheduler.detail.removeConfirmMessage', {
          name: pendingRemoveMechanic?.fullName ?? '',
        })}
      </p>
    </Modal>
  );
});
