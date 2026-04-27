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
            className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition-all duration-200 hover:-translate-y-px hover:bg-arsm-toggle-bg hover:shadow-[0_6px_16px_rgba(45,36,64,0.08)] disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:shadow-[0_6px_16px_rgba(3,5,14,0.28)]"
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
            className="inline-flex items-center justify-center rounded-xl bg-arsm-error-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(215,82,94,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-active hover:shadow-[0_14px_28px_rgba(215,82,94,0.32)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {t('scheduler.detail.removeMechanic')}
          </button>
        </>
      )}
    >
      <p className="break-words rounded-xl border border-arsm-border bg-arsm-input/75 px-3.5 py-3 text-sm text-arsm-label shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] [overflow-wrap:anywhere] dark:border-arsm-border-dark dark:bg-arsm-input-dark/70 dark:text-arsm-label-dark dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {t('scheduler.detail.removeConfirmMessage', {
          name: pendingRemoveMechanic?.fullName ?? '',
        })}
      </p>
    </Modal>
  );
});
