/**
 * Reusable modal dialog shell. Renders via a portal into `document.body`,
 * supports Escape-key dismissal, a backdrop overlay, and an optional footer.
 * Uses the `modal-enter` CSS keyframe animation defined in `index.css`.
 * @module Modal
 */
import { memo, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/** Props for the {@link Modal} component. */
interface ModalProps {
  /** Whether the modal is currently visible. */
  readonly isOpen: boolean;
  /** Callback invoked when the modal should close (overlay click, Escape, or X button). */
  readonly onClose: () => void;
  /** Modal heading text, also used as the dialog `aria-label`. */
  readonly title: string;
  /** Body content rendered inside the dialog. */
  readonly children: ReactNode;
  /** Optional footer content (e.g. action buttons) rendered below the body. */
  readonly footer?: ReactNode;
  /** Tailwind max-width class for the dialog. Defaults to `'max-w-lg'`. */
  readonly widthClassName?: string;
}

/** Memoized modal dialog with portal rendering, backdrop, and keyboard dismissal. */
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
        className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(16,18,32,0.24)_0%,rgba(16,18,32,0.56)_50%,rgba(8,10,20,0.74)_100%)] backdrop-blur-[2px]"
        aria-label={t('modal.closeOverlay')}
        onClick={onClose}
      />

      <NativeDialog
        open
        aria-label={title}
        aria-modal="true"
        className={`relative w-full ${widthClassName} overflow-hidden rounded-3xl border border-arsm-border bg-arsm-input p-5 text-arsm-primary shadow-[0_26px_70px_rgba(13,10,30,0.32),0_0_0_1px_rgba(255,255,255,0.5)_inset] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-primary-dark dark:shadow-[0_30px_74px_rgba(2,4,12,0.75),0_0_0_1px_rgba(255,255,255,0.06)_inset] sm:p-6`}
        style={{ animation: 'modal-enter 240ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)]"
        />

        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-arsm-muted transition hover:bg-arsm-accent-subtle hover:text-arsm-accent-deep dark:text-arsm-muted-dark dark:hover:bg-arsm-hover-dark dark:hover:text-arsm-primary-dark"
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
