import { memo, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface ModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly widthClassName?: string;
}

const ModalComponent = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  widthClassName = 'max-w-lg',
}: ModalProps) {
  const { t } = useTranslation();
  const NativeDialog = 'dialog';

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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={t('modal.closeOverlay')}
        onClick={onClose}
      />

      <NativeDialog
        open
        aria-label={title}
        aria-modal="true"
        className={`relative w-full ${widthClassName} rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] p-5 text-[#2C2440] shadow-[0_20px_56px_rgba(0,0,0,0.35)] dark:border-[#3A3154] dark:bg-[#13131B] dark:text-[#EDE8FA] sm:p-6`}
        style={{ animation: 'modal-enter 200ms ease-out' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#6A627F] transition hover:bg-[#E6DCF8] dark:text-[#B9B0D3] dark:hover:bg-[#322B47]"
            aria-label={t('modal.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>{children}</div>

        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </NativeDialog>
    </div>,
    document.body,
  );
});

ModalComponent.displayName = 'Modal';

export const Modal = ModalComponent;
