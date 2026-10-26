/** Quote delete confirmation; wording says "gone for good" since a deleted quote is not archived. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import { mutedBodyTextClass } from '../../../utils/formStyles';
import type { DeleteQuoteTarget } from '../hooks/useQuoteLifecycleMutations';

interface DeleteQuoteModalProps {
  readonly target: DeleteQuoteTarget | null;
  readonly isDeleting: boolean;
  readonly t: TFunction;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

export const DeleteQuoteModal = memo(function DeleteQuoteModal({
  target,
  isDeleting,
  t,
  onClose,
  onConfirm,
}: DeleteQuoteModalProps) {
  return (
    <ConfirmModal
      isOpen={target !== null}
      title={t('quotes.deleteQuoteTitle')}
      isBusy={isDeleting}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={t('quotes.deleteQuote')}
      busyLabel={t('common.actions.deleting')}
      icon={Trash2}
      tone="danger"
      confirmTestId="quote-delete-confirm-button"
    >
      <p className={`${mutedBodyTextClass} [overflow-wrap:anywhere]`}>
        {t('quotes.deleteConfirm', {
          quoteNumber: target?.quoteNumber ?? '',
          title: target?.title ?? '',
        })}
      </p>
    </ConfirmModal>
  );
});
