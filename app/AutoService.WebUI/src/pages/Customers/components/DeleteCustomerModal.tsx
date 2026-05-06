import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Modal } from '../../../components/common/Modal';
import type { CustomerListItem } from '../../../types/customers/customers.types';
import { buildCustomerDisplayName } from '../helpers';

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
