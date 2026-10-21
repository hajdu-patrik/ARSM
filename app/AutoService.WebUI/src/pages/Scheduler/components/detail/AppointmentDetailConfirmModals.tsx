import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Trash2 } from 'lucide-react';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { ConfirmModal } from '../../../../components/common/ConfirmModal';
import { mutedBodyTextClass } from '../../../../utils/formStyles';
import { AppointmentCardActionModals } from '../shared/AppointmentCardActionModals';

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
  readonly isDeleteConfirmOpen: boolean;
  readonly isDeleting: boolean;
  readonly onCloseDeleteConfirm: () => void;
  readonly onConfirmDelete: () => void;
}

export const AppointmentDetailConfirmModals = memo(function AppointmentDetailConfirmModals({
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
  isDeleteConfirmOpen,
  isDeleting,
  onCloseDeleteConfirm,
  onConfirmDelete,
}: AppointmentDetailConfirmModalsProps) {
  const { t } = useTranslation();

  return (
    <>
      <ConfirmModal
        isOpen={pendingStatusChange !== null}
        title={t('scheduler.detail.statusChangeConfirmTitle')}
        isBusy={isUpdating}
        onClose={onCloseStatusConfirm}
        onConfirm={onConfirmStatusChange}
        confirmLabel={t('scheduler.detail.confirmStatusChange')}
        busyLabel={t('common.actions.saving')}
        icon={Save}
        confirmDisabled={pendingStatusChange === null}
      >
        <p className={mutedBodyTextClass}>
          {t('scheduler.detail.statusChangeConfirmMessage', {
            status: pendingStatusChange ? t(`scheduler.status.${pendingStatusChange.toLowerCase()}`) : '',
          })}
        </p>
      </ConfirmModal>

      <AppointmentCardActionModals
        isClaimConfirmOpen={isClaimConfirmOpen}
        isUnclaimConfirmOpen={isUnclaimConfirmOpen}
        isClaiming={isClaiming}
        isUnclaiming={isUnclaiming}
        onCloseClaimConfirm={onCloseClaimConfirm}
        onCloseUnclaimConfirm={onCloseUnclaimConfirm}
        onConfirmClaim={onConfirmClaim}
        onConfirmUnclaim={onConfirmUnclaim}
      />

      <ConfirmModal
        isOpen={isSaveConfirmOpen}
        title={t('scheduler.detail.saveConfirmTitle')}
        isBusy={isSaving}
        onClose={onCloseSaveConfirm}
        onConfirm={onConfirmSave}
        confirmLabel={t('common.actions.save')}
        busyLabel={t('common.actions.saving')}
        icon={Save}
      >
        <p className={mutedBodyTextClass}>{t('scheduler.detail.saveConfirmMessage')}</p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title={t('scheduler.detail.deleteConfirmTitle')}
        isBusy={isDeleting}
        onClose={onCloseDeleteConfirm}
        onConfirm={onConfirmDelete}
        confirmLabel={t('scheduler.detail.delete')}
        busyLabel={t('common.actions.deleting')}
        icon={Trash2}
        tone="danger"
        confirmTestId="appointment-detail-delete-confirm"
      >
        <p className={mutedBodyTextClass}>{t('scheduler.detail.deleteConfirmMessage')}</p>
      </ConfirmModal>
    </>
  );
});
