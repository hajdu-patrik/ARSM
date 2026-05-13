/**
 * Modal close button component.
 *
 * @module components/common/ModalCloseButton
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { modalConfirmCloseButtonClass } from '../../utils/formStyles';

interface ModalCloseButtonProps {
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly variant?: 'default' | 'confirm';
}

const ModalCloseButtonComponent = memo(function ModalCloseButton({
  onClick,
  disabled = false,
}: ModalCloseButtonProps) {
  const { t: translate } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={translate('modal.close')}
      title={translate('modal.close')}
      className={modalConfirmCloseButtonClass}
    >
      <X className="h-4 w-4" />
    </button>
  );
});

ModalCloseButtonComponent.displayName = 'ModalCloseButton';

export const ModalCloseButton = ModalCloseButtonComponent;