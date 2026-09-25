import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Save, UserPlus } from 'lucide-react';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { Modal } from '../../../../components/common/Modal';
import {
  buttonClass,
  dangerButtonClass,
  defaultIconClass,
  mutedBodyTextClass,
  secondaryButtonClass,
} from '../../../../utils/formStyles';

interface AppointmentDetailConfirmModalsProps {
  readonly pendingStatusChange: AppointmentStatus | null;
  readonly isUpdating: boolean;
  readonly onCloseStatusConfirm: () => void;
  readonly onConfirmStatusChange: () => void;
  readonly isClaimConfirmOpen: boolean;
  readonly isClaiming: boolean;
  readonly onCloseClaimConfirm: () => void;
  readonly onConfirmClaim: () => void;
  readonly isUnclaimConfirmOpen: boolean;
  readonly isUnclaiming: boolean;
  readonly onCloseUnclaimConfirm: () => void;
  readonly onConfirmUnclaim: () => void;
  readonly isSaveConfirmOpen: boolean;
  readonly isSaving: boolean;
  readonly onCloseSaveConfirm: () => void;
  readonly onConfirmSave: () => void;
}

const AppointmentDetailConfirmModalsComponent = memo(function AppointmentDetailConfirmModals({
  pendingStatusChange,
  isUpdating,
  onCloseStatusConfirm,
  onConfirmStatusChange,
  isClaimConfirmOpen,
  isClaiming,
  onCloseClaimConfirm,
  onConfirmClaim,
  isUnclaimConfirmOpen,
  isUnclaiming,
  onCloseUnclaimConfirm,
  onConfirmUnclaim,
  isSaveConfirmOpen,
  isSaving,
  onCloseSaveConfirm,
  onConfirmSave,
}: AppointmentDetailConfirmModalsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Modal
        isOpen={pendingStatusChange !== null}
        onClose={onCloseStatusConfirm}
        title={t('scheduler.detail.statusChangeConfirmTitle')}
        variant="confirm"
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseStatusConfirm}
              disabled={isUpdating}
              className={secondaryButtonClass}
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmStatusChange}
              disabled={isUpdating || pendingStatusChange === null}
              aria-busy={isUpdating}
              className={buttonClass}
            >
              <Save className={defaultIconClass} />
              <span>{isUpdating ? t('common.actions.saving') : t('scheduler.detail.confirmStatusChange')}</span>
            </button>
          </>
        )}
      >
        <p className={mutedBodyTextClass}>
          {t('scheduler.detail.statusChangeConfirmMessage', {
            status: pendingStatusChange ? t(`scheduler.status.${pendingStatusChange.toLowerCase()}`) : '',
          })}
        </p>
      </Modal>

      <Modal
        isOpen={isClaimConfirmOpen}
        onClose={onCloseClaimConfirm}
        title={t('scheduler.detail.claimConfirmTitle')}
        variant="confirm"
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseClaimConfirm}
              disabled={isClaiming}
              className={secondaryButtonClass}
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmClaim}
              disabled={isClaiming}
              aria-busy={isClaiming}
              className={buttonClass}
            >
              <UserPlus className={defaultIconClass} />
              <span>{isClaiming ? t('common.actions.saving') : t('scheduler.claim')}</span>
            </button>
          </>
        )}
      >
        <p className={mutedBodyTextClass}>{t('scheduler.detail.claimConfirmMessage')}</p>
      </Modal>

      <Modal
        isOpen={isUnclaimConfirmOpen}
        onClose={onCloseUnclaimConfirm}
        title={t('scheduler.detail.unassignConfirmTitle')}
        variant="confirm"
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseUnclaimConfirm}
              disabled={isUnclaiming}
              className={secondaryButtonClass}
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmUnclaim}
              disabled={isUnclaiming}
              aria-busy={isUnclaiming}
              className={dangerButtonClass}
            >
              <LogOut className={defaultIconClass} />
              <span>{isUnclaiming ? t('common.actions.saving') : t('scheduler.detail.confirmUnassign')}</span>
            </button>
          </>
        )}
      >
        <p className={mutedBodyTextClass}>{t('scheduler.detail.unassignConfirmMessage')}</p>
      </Modal>

      <Modal
        isOpen={isSaveConfirmOpen}
        onClose={onCloseSaveConfirm}
        title={t('scheduler.detail.saveConfirmTitle')}
        variant="confirm"
        footer={(
          <>
            <button
              type="button"
              onClick={onCloseSaveConfirm}
              disabled={isSaving}
              className={secondaryButtonClass}
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmSave}
              disabled={isSaving}
              aria-busy={isSaving}
              className={buttonClass}
            >
              <Save className={defaultIconClass} />
              <span>{isSaving ? t('common.actions.saving') : t('common.actions.save')}</span>
            </button>
          </>
        )}
      >
        <p className={mutedBodyTextClass}>{t('scheduler.detail.saveConfirmMessage')}</p>
      </Modal>
    </>
  );
});

AppointmentDetailConfirmModalsComponent.displayName = 'AppointmentDetailConfirmModals';

export const AppointmentDetailConfirmModals = AppointmentDetailConfirmModalsComponent;
