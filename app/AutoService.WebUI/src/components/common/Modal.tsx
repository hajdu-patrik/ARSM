/**
 * Reusable modal dialog shell rendered via a portal.
 * Supports overlay click and Escape-key dismissal.
 * @module Modal
 */
import { memo, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { controlPanelFooterClass } from '../../utils/formStyles';
import { ModalCloseButton } from './ModalCloseButton';

interface ModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly footerClassName?: string;
  readonly widthClassName?: string;
  readonly showCloseButton?: boolean;
  readonly variant?: 'default' | 'confirm';
}

const ModalComponent = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  footerClassName,
  widthClassName,
  showCloseButton = true,
  variant = 'default',
}: ModalProps) {
  const { t: translate } = useTranslation();
  const NativeDialog = 'dialog';
  const isConfirmVariant = variant === 'confirm';
  const shouldShowCloseButton = showCloseButton;
  const resolvedWidthClassName = widthClassName ?? (isConfirmVariant ? 'max-w-xl' : 'max-w-md');
  const footerClasses = ['mt-5', controlPanelFooterClass, isConfirmVariant ? 'arsm-modal-footer-confirm' : '', footerClassName ?? '']
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    globalThis.addEventListener('keydown', handleEscape);
    return () => {
      globalThis.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 max-[320px]:p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-arsm-deepest/50 backdrop-blur-sm transition-opacity duration-200"
        aria-label={translate('modal.closeOverlay')}
        onClick={onClose}
      />

      <NativeDialog
        open
        aria-label={title}
        aria-modal="true"
        className={`arsm-modal-dialog relative w-[95%] sm:w-full ${resolvedWidthClassName} overflow-hidden rounded-2xl border-[2.5px] border-arsm-primary/60 bg-arsm-card p-5 text-arsm-primary transition-all duration-200 max-[320px]:p-3.5 dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-primary-dark sm:p-6`}
      >
        <div
          aria-hidden="true"
          className="arsm-modal-sheen pointer-events-none absolute inset-x-0 top-0 h-16"
        />

        <div className={`mb-4 min-w-0 ${isConfirmVariant ? 'relative flex min-h-11 items-center justify-center' : 'flex items-center justify-between gap-3'}`}>
          <h2 className={`min-w-0 ${isConfirmVariant ? 'break-words px-12 text-center text-xl font-semibold [overflow-wrap:anywhere] sm:text-2xl' : 'truncate text-lg font-semibold'}`}>{title}</h2>
          {shouldShowCloseButton && (
            <div className={isConfirmVariant ? 'absolute right-0 top-0 shrink-0' : 'shrink-0'}>
              <ModalCloseButton onClick={onClose} />
            </div>
          )}
        </div>

        <div className={isConfirmVariant ? 'mx-auto max-w-[32rem] text-center' : ''}>{children}</div>
        {footer && (
          <div className={footerClasses}>
            {footer}
          </div>
        )}
      </NativeDialog>
    </div>,
    document.body,
  );
});

ModalComponent.displayName = 'Modal';
export const Modal = ModalComponent;
