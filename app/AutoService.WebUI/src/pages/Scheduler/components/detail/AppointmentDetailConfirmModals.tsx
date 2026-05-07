import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { Modal } from '../../../../components/common/Modal';
import { buttonClass, dangerButtonClass, secondaryButtonClass } from '../../../../utils/formStyles';

interface AppointmentDetailConfirmModalsProps {
  readonly pendingStatusChange: AppointmentStatus | null;
  readonly isUpdating: boolean;
  readonly onCloseStatusConfirm: () => void;
  readonly onConfirmStatusChange: () => void;
  readonly isUnclaimConfirmOpen: boolean;
  readonly isUnclaiming: boolean;
  readonly onCloseUnclaimConfirm: () => void;
  readonly onConfirmUnclaim: () => void;
}

const AppointmentDetailConfirmModalsComponent = memo(function AppointmentDetailConfirmModals({
  pendingStatusChange,
  isUpdating,
  onCloseStatusConfirm,
  onConfirmStatusChange,
  isUnclaimConfirmOpen,
  isUnclaiming,
  onCloseUnclaimConfirm,
  onConfirmUnclaim,
}: AppointmentDetailConfirmModalsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Modal
        isOpen={pendingStatusChange !== null}
        onClose={onCloseStatusConfirm}
        title={t('scheduler.detail.statusChangeConfirmTitle')}
        showCloseButton={false}
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseStatusConfirm}
              disabled={isUpdating}
              className={secondaryButtonClass}
            >
              {t('scheduler.intake.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmStatusChange}
              disabled={isUpdating || pendingStatusChange === null}
              className={buttonClass}
            >
              {isUpdating ? t('scheduler.detail.saving') : t('scheduler.detail.confirmStatusChange')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">
          {t('scheduler.detail.statusChangeConfirmMessage', {
            status: pendingStatusChange ? t(`scheduler.status.${pendingStatusChange.toLowerCase()}`) : '',
          })}
        </p>
      </Modal>

      <Modal
        isOpen={isUnclaimConfirmOpen}
        onClose={onCloseUnclaimConfirm}
        title={t('scheduler.detail.unassignConfirmTitle')}
        showCloseButton={false}
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseUnclaimConfirm}
              disabled={isUnclaiming}
              className={secondaryButtonClass}
            >
              {t('scheduler.intake.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmUnclaim}
              disabled={isUnclaiming}
              className={dangerButtonClass}
            >
              {isUnclaiming ? t('scheduler.detail.saving') : t('scheduler.detail.confirmUnassign')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('scheduler.detail.unassignConfirmMessage')}</p>
      </Modal>
    </>
  );
});

AppointmentDetailConfirmModalsComponent.displayName = 'AppointmentDetailConfirmModals';

export const AppointmentDetailConfirmModals = AppointmentDetailConfirmModalsComponent;
