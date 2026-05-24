import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import { dangerButtonClass, mutedBodyTextClass, secondaryButtonClass } from '../../../utils/formStyles';

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
      onClose={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
      title={t('customers.deleteVehicleTitle')}
      variant="confirm"
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
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>{isDeleting ? t('customers.deleting') : t('customers.deleteVehicle')}</span>
          </button>
        </>
      )}
    >
      <p className={mutedBodyTextClass}>
        {t('customers.deleteVehicleConfirm', {
          plate: target?.vehicle.licensePlate ?? '',
        })}
      </p>
    </Modal>
  );
});

DeleteVehicleModalComponent.displayName = 'DeleteVehicleModal';

export const DeleteVehicleModal = DeleteVehicleModalComponent;
