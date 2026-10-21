import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import type { CustomerListItem } from '../../../types/customers/customers.types';
import { buildCustomerDisplayName } from '../helpers';
import { mutedBodyTextClass } from '../../../utils/formStyles';

interface DeleteCustomerModalProps {
  target: CustomerListItem | null;
  isDeleting: boolean;
  t: TFunction;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteCustomerModal = memo(function DeleteCustomerModal({
  target,
  isDeleting,
  t,
  onClose,
  onConfirm,
}: DeleteCustomerModalProps) {
  return (
    <ConfirmModal
      isOpen={target !== null}
      title={t('customers.deleteCustomerTitle')}
      isBusy={isDeleting}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={t('customers.deleteCustomer')}
      busyLabel={t('common.actions.deleting')}
      icon={Trash2}
      tone="danger"
    >
      <p className={mutedBodyTextClass}>
        {t('customers.deleteCustomerConfirm', {
          name: target ? buildCustomerDisplayName(target) : '',
        })}
      </p>
    </ConfirmModal>
  );
});
