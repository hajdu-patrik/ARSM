import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import type { CustomerListItem } from '../../../types/customers/customers.types';
import { buildCustomerDisplayName } from '../helpers';
import { referenceChipDangerButtonClass, referenceChipNeutralButtonClass } from '../../../utils/formStyles';

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
      onClose={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
      title={t('customers.deleteCustomerTitle')}
      variant="confirm"
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className={referenceChipNeutralButtonClass}
          >
            {t('settings.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={referenceChipDangerButtonClass}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>{isDeleting ? t('customers.deleting') : t('customers.deleteCustomer')}</span>
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
