/**
 * Modal close button component.
 *
 * Renders a standardized X-icon close button for modal dialogs.
 * Follows accessibility best practices with ARIA labels and keyboard support.
 * @module components/common/ModalCloseButton
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/** Props for the {@link ModalCloseButton} component. */
interface ModalCloseButtonProps {
  /** Callback invoked when the button is clicked. */
  readonly onClick: () => void;
  /** Whether the button should be disabled. Defaults to false. */
  readonly disabled?: boolean;
}

/**
 * Accessible close button for modal dialogs.
 * Displays an X icon with proper ARIA labels and tooltip.
 * Memoized to prevent unnecessary re-renders.
 */
const ModalCloseButtonComponent = memo(function ModalCloseButton({
  onClick,
  disabled = false,
}: ModalCloseButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t('modal.close')}
      title={t('modal.close')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-arsm-border bg-arsm-input text-arsm-label transition-all duration-200 hover:-translate-y-px hover:bg-arsm-toggle-bg hover:text-arsm-primary disabled:cursor-not-allowed disabled:opacity-55 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:text-arsm-primary-dark"
    >
      <X className="h-4 w-4" />
    </button>
  );
});

ModalCloseButtonComponent.displayName = 'ModalCloseButton';

export const ModalCloseButton = ModalCloseButtonComponent;