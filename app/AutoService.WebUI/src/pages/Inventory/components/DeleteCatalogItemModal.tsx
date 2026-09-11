/**
 * Delete confirmation modal shared by the Parts and Labor types tabs.
 * States the effect on quotes: existing quotes keep their snapshotted
 * name, price, and VAT, so deleting master data never changes a past quote.
 * @module pages/Inventory/components/DeleteCatalogItemModal
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { dangerButtonClass, mutedBodyTextClass, secondaryButtonClass } from '../../../utils/formStyles';
import type { DeleteCatalogItemTarget } from '../helpers';

interface DeleteCatalogItemModalProps {
  readonly target: DeleteCatalogItemTarget | null;
  readonly isDeleting: boolean;
  readonly t: TFunction;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

const DeleteCatalogItemModalComponent = memo(function DeleteCatalogItemModal({
  target,
  isDeleting,
  t,
  onClose,
  onConfirm,
}: DeleteCatalogItemModalProps) {
  const title = target?.kind === 'laborType' ? t('inventory.deleteLaborTypeTitle') : t('inventory.deletePartTitle');
  const confirmLabel = target?.kind === 'laborType' ? t('inventory.deleteLaborType') : t('inventory.deletePart');

  return (
    <Modal
      isOpen={target !== null}
      onClose={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
      title={title}
      variant="confirm"
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={isDeleting} className={secondaryButtonClass}>
            {t('settings.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-busy={isDeleting}
            className={dangerButtonClass}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>{isDeleting ? t('inventory.deleting') : confirmLabel}</span>
          </button>
        </>
      )}
    >
      <p className={mutedBodyTextClass}>
        {t('inventory.deleteConfirm', {
          name: target?.name ?? '',
          identifier: target?.identifier ?? '',
        })}
      </p>
    </Modal>
  );
});

DeleteCatalogItemModalComponent.displayName = 'DeleteCatalogItemModal';

export const DeleteCatalogItemModal = DeleteCatalogItemModalComponent;
