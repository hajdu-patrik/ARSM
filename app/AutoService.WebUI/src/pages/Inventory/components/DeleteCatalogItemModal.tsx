/** Delete confirmation shared by Parts/Labor types tabs; past quotes keep their snapshotted name/price/VAT, unaffected. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import { mutedBodyTextClass } from '../../../utils/formStyles';
import type { DeleteCatalogItemTarget } from '../helpers';

interface DeleteCatalogItemModalProps {
  readonly target: DeleteCatalogItemTarget | null;
  readonly isDeleting: boolean;
  readonly t: TFunction;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

export const DeleteCatalogItemModal = memo(function DeleteCatalogItemModal({
  target,
  isDeleting,
  t,
  onClose,
  onConfirm,
}: DeleteCatalogItemModalProps) {
  const isLaborType = target?.kind === 'laborType';

  return (
    <ConfirmModal
      isOpen={target !== null}
      title={isLaborType ? t('inventory.deleteLaborTypeTitle') : t('inventory.deletePartTitle')}
      isBusy={isDeleting}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={isLaborType ? t('inventory.deleteLaborType') : t('inventory.deletePart')}
      busyLabel={t('common.actions.deleting')}
      icon={Trash2}
      tone="danger"
    >
      <p className={`${mutedBodyTextClass} [overflow-wrap:anywhere]`}>
        {t('inventory.deleteConfirm', {
          name: target?.name ?? '',
          identifier: target?.identifier ?? '',
        })}
      </p>
    </ConfirmModal>
  );
});
