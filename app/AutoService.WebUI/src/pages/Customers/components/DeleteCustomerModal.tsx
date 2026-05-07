import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Modal } from '../../../components/common/Modal';
import type { CustomerListItem } from '../../../types/customers/customers.types';
import { buildCustomerDisplayName } from '../helpers';
import { dangerButtonClass, secondaryButtonClass } from '../../../utils/formStyles';

interface DeleteCustomerModalProps {
  target: CustomerListItem | null;
  isDeleting: boolean;
  t: TFunction;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteCustomerModalComponent = memo(function DeleteCustomerModal({
  target,
  isDeleting,
  t,
  onClose,
  onConfirm,
}: DeleteCustomerModalProps) {
  return (
    <Modal
      isOpen={target !== null}
      onClose={onClose}
      title={t('customers.deleteCustomerTitle')}
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
            {isDeleting ? t('customers.deleting') : t('customers.deleteCustomer')}
          </button>
        </>
      )}
    >
      <p className="text-sm text-arsm-label dark:text-arsm-label-dark">
        {t('customers.deleteCustomerConfirm', {
          name: target ? buildCustomerDisplayName(target) : '',
        })}
      </p>
    </Modal>
  );
});

DeleteCustomerModalComponent.displayName = 'DeleteCustomerModal';

export const DeleteCustomerModal = DeleteCustomerModalComponent;
