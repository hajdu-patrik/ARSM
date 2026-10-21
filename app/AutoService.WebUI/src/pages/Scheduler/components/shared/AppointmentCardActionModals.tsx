/** Appointment claim and self-unassign confirmation modals, shared by the cards and the detail modal. */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, UserPlus } from 'lucide-react';
import { ConfirmModal } from '../../../../components/common/ConfirmModal';
import { mutedBodyTextClass } from '../../../../utils/formStyles';

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

/** Renders the claim and self-unassign confirmation modals. */
export const AppointmentCardActionModals = memo(function AppointmentCardActionModals({
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
      <ConfirmModal
        isOpen={isClaimConfirmOpen}
        title={t('scheduler.detail.claimConfirmTitle')}
        isBusy={isClaiming}
        onClose={onCloseClaimConfirm}
        onConfirm={onConfirmClaim}
        confirmLabel={t('scheduler.claim')}
        busyLabel={t('common.actions.saving')}
        icon={UserPlus}
      >
        <p className={mutedBodyTextClass}>{t('scheduler.detail.claimConfirmMessage')}</p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={isUnclaimConfirmOpen}
        title={t('scheduler.detail.unassignConfirmTitle')}
        isBusy={isUnclaiming}
        onClose={onCloseUnclaimConfirm}
        onConfirm={onConfirmUnclaim}
        confirmLabel={t('scheduler.detail.confirmUnassign')}
        busyLabel={t('common.actions.saving')}
        icon={LogOut}
        tone="danger"
      >
        <p className={mutedBodyTextClass}>{t('scheduler.detail.unassignConfirmMessage')}</p>
      </ConfirmModal>
    </>
  );
});
