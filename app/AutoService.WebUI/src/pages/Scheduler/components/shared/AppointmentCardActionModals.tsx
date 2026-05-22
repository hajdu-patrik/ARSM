/**
 * Appointment card action confirmation modals.
 * @module pages/Scheduler/components/shared/AppointmentCardActionModals
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, UserPlus } from 'lucide-react';
import { Modal } from '../../../../components/common/Modal';
import { buttonClass, dangerButtonClass, mutedBodyTextClass, secondaryButtonClass } from '../../../../utils/formStyles';

interface AppointmentCardActionModalsProps {
  readonly isClaimConfirmOpen: boolean;
  readonly isUnclaimConfirmOpen: boolean;
  readonly isClaiming: boolean;
  readonly isUnclaiming: boolean;
  readonly onCloseClaimConfirm: () => void;
  readonly onCloseUnclaimConfirm: () => void;
  readonly onConfirmClaim: () => void;
  readonly onConfirmUnclaim: () => void;
}

/** Renders claim and self-unassign confirmation modals for appointment cards. */
const AppointmentCardActionModalsComponent = memo(function AppointmentCardActionModals({
  isClaimConfirmOpen,
  isUnclaimConfirmOpen,
  isClaiming,
  isUnclaiming,
  onCloseClaimConfirm,
  onCloseUnclaimConfirm,
  onConfirmClaim,
  onConfirmUnclaim,
}: AppointmentCardActionModalsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Modal
        isOpen={isClaimConfirmOpen}
        onClose={onCloseClaimConfirm}
        title={t('scheduler.detail.claimConfirmTitle')}
        variant="confirm"
        footer={(
          <>
            <button type="button" onClick={onCloseClaimConfirm} disabled={isClaiming} className={secondaryButtonClass}>
              {t('scheduler.intake.cancel')}
            </button>
            <button type="button" onClick={onConfirmClaim} disabled={isClaiming} className={buttonClass}>
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
            <button type="button" onClick={onCloseUnclaimConfirm} disabled={isUnclaiming} className={secondaryButtonClass}>
              {t('scheduler.intake.cancel')}
            </button>
            <button type="button" onClick={onConfirmUnclaim} disabled={isUnclaiming} className={dangerButtonClass}>
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{isUnclaiming ? t('scheduler.detail.saving') : t('scheduler.detail.confirmUnassign')}</span>
            </button>
          </>
        )}
      >
        <p className={mutedBodyTextClass}>{t('scheduler.detail.unassignConfirmMessage')}</p>
      </Modal>
    </>
  );
});

AppointmentCardActionModalsComponent.displayName = 'AppointmentCardActionModals';

export const AppointmentCardActionModals = AppointmentCardActionModalsComponent;
