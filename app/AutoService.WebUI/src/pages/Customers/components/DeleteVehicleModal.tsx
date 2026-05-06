import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Modal } from '../../../components/common/Modal';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';

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
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
          >
            {t('settings.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-xl bg-arsm-error-accent px-4 py-2.5 text-sm font-semibold text-arsm-on-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-active disabled:cursor-not-allowed disabled:opacity-60 dark:text-arsm-on-accent-dark"
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
