import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import { mutedBodyTextClass } from '../../../utils/formStyles';
import type { DeleteVehicleTarget } from '../page.types';

interface DeleteVehicleModalProps {
  target: DeleteVehicleTarget | null;
  isDeleting: boolean;
  t: TFunction;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteVehicleModal = memo(function DeleteVehicleModal({
  target,
  isDeleting,
  t,
  onClose,
  onConfirm,
}: DeleteVehicleModalProps) {
  return (
    <ConfirmModal
      isOpen={target !== null}
      title={t('customers.deleteVehicleTitle')}
      isBusy={isDeleting}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={t('customers.deleteVehicle')}
      busyLabel={t('common.actions.deleting')}
      icon={Trash2}
      tone="danger"
    >
      <p className={mutedBodyTextClass}>
        {t('customers.deleteVehicleConfirm', {
          plate: target?.vehicle.licensePlate ?? '',
        })}
      </p>
    </ConfirmModal>
  );
});
