/**
 * Modal close button component.
 *
 * @module components/common/ModalCloseButton
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface ModalCloseButtonProps {
  readonly onClick: () => void;
  readonly disabled?: boolean;
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
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-arsm-border bg-arsm-input text-arsm-label transition-all duration-200 hover:-translate-y-px hover:bg-arsm-toggle-bg hover:text-arsm-primary disabled:cursor-not-allowed disabled:opacity-55 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:text-arsm-primary-dark"
    >
      <X className="h-4 w-4" />
    </button>
  );
});

ModalCloseButtonComponent.displayName = 'ModalCloseButton';

export const ModalCloseButton = ModalCloseButtonComponent;