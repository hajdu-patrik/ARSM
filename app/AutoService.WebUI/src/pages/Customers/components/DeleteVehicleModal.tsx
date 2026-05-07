import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Modal } from '../../../components/common/Modal';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import { dangerButtonClass, secondaryButtonClass } from '../../../utils/formStyles';

interface DeleteVehicleTarget {
  customerId: number;
  vehicle: VehicleDetailDto;
}

interface DeleteVehicleModalProps {
  target: DeleteVehicleTarget | null;
  isDeleting: boolean;
  t: TFunction;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteVehicleModalComponent = memo(function DeleteVehicleModal({
  target,
  isDeleting,
  t,
  onClose,
  onConfirm,
}: DeleteVehicleModalProps) {
  return (
    <Modal
      isOpen={target !== null}
      onClose={onClose}
      title={t('customers.deleteVehicleTitle')}
      showCloseButton={false}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className={secondaryButtonClass}
          >
            {t('settings.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={dangerButtonClass}
          >
            {isDeleting ? t('customers.deleting') : t('customers.deleteVehicle')}
          </button>
        </>
      )}
    >
      <p className="text-sm text-arsm-label dark:text-arsm-label-dark">
        {t('customers.deleteVehicleConfirm', {
          plate: target?.vehicle.licensePlate ?? '',
        })}
      </p>
    </Modal>
  );
});

DeleteVehicleModalComponent.displayName = 'DeleteVehicleModal';

export const DeleteVehicleModal = DeleteVehicleModalComponent;
