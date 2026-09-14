/**
 * Quote delete confirmation. Only a draft can be deleted, so the wording
 * says the quote and its lines go away for good rather than hinting at an
 * archive that does not exist.
 * @module pages/Quotes/components/DeleteQuoteModal
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { dangerButtonClass, mutedBodyTextClass, secondaryButtonClass } from '../../../utils/formStyles';
import type { DeleteQuoteTarget } from '../hooks/useQuoteMutations';

interface DeleteQuoteModalProps {
  readonly target: DeleteQuoteTarget | null;
  readonly isDeleting: boolean;
  readonly t: TFunction;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

const DeleteQuoteModalComponent = memo(function DeleteQuoteModal({
  target,
  isDeleting,
  t,
  onClose,
  onConfirm,
}: DeleteQuoteModalProps) {
  return (
    <Modal
      isOpen={target !== null}
      onClose={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
      title={t('quotes.deleteQuoteTitle')}
      variant="confirm"
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={isDeleting} className={secondaryButtonClass}>
            {t('settings.cancel')}
          </button>
          <button
            data-testid="quote-delete-confirm-button"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-busy={isDeleting}
            className={dangerButtonClass}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>{isDeleting ? t('quotes.deleting') : t('quotes.deleteQuote')}</span>
          </button>
        </>
      )}
    >
      <p className={mutedBodyTextClass}>
        {t('quotes.deleteConfirm', {
          quoteNumber: target?.quoteNumber ?? '',
          title: target?.title ?? '',
        })}
      </p>
    </Modal>
  );
});

DeleteQuoteModalComponent.displayName = 'DeleteQuoteModal';

export const DeleteQuoteModal = DeleteQuoteModalComponent;
