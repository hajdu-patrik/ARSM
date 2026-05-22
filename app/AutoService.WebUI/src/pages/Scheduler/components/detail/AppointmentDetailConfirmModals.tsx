import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Save, UserPlus } from 'lucide-react';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { Modal } from '../../../../components/common/Modal';
import {
  mutedBodyTextClass,
  referenceChipDangerButtonClass,
  referenceChipNeutralButtonClass,
  referenceChipPrimaryButtonClass,
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
              className={referenceChipNeutralButtonClass}
            >
              {t('scheduler.intake.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmStatusChange}
              disabled={isUpdating || pendingStatusChange === null}
              className={referenceChipPrimaryButtonClass}
            >
              <Save className="h-4 w-4 shrink-0" />
              <span>{isUpdating ? t('scheduler.detail.saving') : t('scheduler.detail.confirmStatusChange')}</span>
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
              className={referenceChipNeutralButtonClass}
            >
              {t('scheduler.intake.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmClaim}
              disabled={isClaiming}
              className={referenceChipPrimaryButtonClass}
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>{isClaiming ? t('scheduler.detail.saving') : t('scheduler.detail.confirmClaim')}</span>
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
              className={referenceChipNeutralButtonClass}
            >
              {t('scheduler.intake.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmUnclaim}
              disabled={isUnclaiming}
              className={referenceChipDangerButtonClass}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{isUnclaiming ? t('scheduler.detail.saving') : t('scheduler.detail.confirmUnassign')}</span>
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
              className={referenceChipNeutralButtonClass}
            >
              {t('scheduler.intake.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirmSave}
              disabled={isSaving}
              className={referenceChipPrimaryButtonClass}
            >
              <Save className="h-4 w-4 shrink-0" />
              <span>{isSaving ? t('scheduler.detail.saving') : t('scheduler.detail.confirmSave')}</span>
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
