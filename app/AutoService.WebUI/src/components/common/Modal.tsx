/**
 * Reusable modal dialog shell. Renders via a portal into `document.body`,
 * supports Escape-key dismissal, a backdrop overlay, and an optional footer.
 * Uses the `modal-enter` CSS keyframe animation defined in `index.css`.
 * @module Modal
 */
import { memo, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

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
  /** Optional right-aligned header action area. */
  readonly headerAction?: ReactNode;
}

/** Memoized modal dialog with portal rendering, backdrop, and keyboard dismissal. */
const ModalComponent = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  widthClassName = 'max-w-lg',
  headerAction,
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 max-[320px]:p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        aria-label={t('modal.closeOverlay')}
        onClick={onClose}
      />

      <NativeDialog
        open
        aria-label={title}
        aria-modal="true"
        className={`relative w-full max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] ${widthClassName} overflow-hidden rounded-2xl border border-arsm-border bg-arsm-card p-5 text-arsm-primary shadow-[0_18px_40px_rgba(13,10,30,0.28)] transition-all duration-200 max-[320px]:p-3.5 dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-primary-dark dark:shadow-[0_22px_48px_rgba(2,4,12,0.68)] sm:p-6`}
        style={{ animation: 'modal-enter 200ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)]"
        />

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
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
