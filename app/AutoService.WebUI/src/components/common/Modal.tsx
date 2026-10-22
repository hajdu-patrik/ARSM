/** Reusable modal dialog shell rendered via a portal. The topmost modal traps Tab, takes the initial focus,
 * hands it back to the opener on close and dismisses on overlay click or Escape; the app shell is inert meanwhile. */
import { memo, useEffect, useEffectEvent, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { controlPanelFooterClass, feedbackFrameClass } from '../../utils/formStyles';
import { isTopDialog, pushDialog, removeDialog } from './modalStack';
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
  /** Caps the dialog at the dynamic viewport height; the body must then scroll itself (`min-h-0 flex-1`). */
  readonly fitViewport?: boolean;
  readonly variant?: 'default' | 'confirm';
}

/** Elements that can take part in the Tab sequence. */
const TABBABLE_SELECTOR = 'a[href], button, input, select, textarea, [tabindex]';

/** Tab stops inside a container in DOM order: enabled, rendered, visible and not taken out with tabindex="-1". */
function getTabbableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0
      && !element.matches(':disabled')
      && element.getClientRects().length > 0
      && getComputedStyle(element).visibility !== 'hidden',
  );
}

/** Keeps Tab inside the dialog: it wraps at both ends and pulls focus back in when it sits outside. */
function trapTab(event: KeyboardEvent, dialog: HTMLElement): void {
  const tabbables = getTabbableElements(dialog);
  const first = tabbables[0];
  const last = tabbables.at(-1);
  if (first === undefined || last === undefined) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const active = document.activeElement;
  const isInside = active !== null && active !== dialog && dialog.contains(active);
  const isAtEdge = active === (event.shiftKey ? first : last);
  if (!isInside || isAtEdge) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

/** Hands focus back to the opener once the modal is gone, unless focus has deliberately moved elsewhere. */
function returnFocus(opener: Element | null, dialog: HTMLElement): void {
  const active = document.activeElement;
  const isFocusFree = active === null || active === document.body || dialog.contains(active);
  if (isFocusFree && opener instanceof HTMLElement && opener.isConnected) {
    opener.focus();
  }
}

/** Gives the open dialog its modal keyboard behaviour (initial focus, Tab trap, Escape, focus return); returns its ref. */
function useModalKeyboard(isOpen: boolean, onClose: () => void): RefObject<HTMLDialogElement | null> {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestClose = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || dialog === null) {
      return;
    }

    const opener = document.activeElement;
    pushDialog(dialog);
    (getTabbableElements(dialog)[0] ?? dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopDialog(dialog)) {
        return;
      }

      if (event.key === 'Escape') {
        requestClose();
      } else if (event.key === 'Tab') {
        trapTab(event, dialog);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      removeDialog(dialog);
      returnFocus(opener, dialog);
    };
  }, [isOpen]);

  return dialogRef;
}

export const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  footerClassName,
  widthClassName,
  showCloseButton = true,
  fitViewport = false,
  variant = 'default',
}: ModalProps) {
  const { t: translate } = useTranslation();
  const titleId = useId();
  const dialogRef = useModalKeyboard(isOpen, onClose);
  const isConfirmVariant = variant === 'confirm';
  const resolvedWidthClassName = widthClassName ?? (isConfirmVariant ? 'max-w-xl' : 'max-w-md');
  const dialogFitClass = fitViewport
    ? 'flex max-h-[calc(100dvh-2rem)] flex-col max-[320px]:max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]'
    : '';
  const bodyClasses = [isConfirmVariant ? 'mx-auto max-w-[32rem] text-center' : '', fitViewport ? 'flex min-h-0 flex-1 flex-col' : '']
    .filter(Boolean)
    .join(' ');
  const footerClasses = ['mt-5', fitViewport ? 'shrink-0' : '', controlPanelFooterClass, isConfirmVariant ? 'arsm-modal-footer-confirm' : '', footerClassName ?? '']
    .filter(Boolean)
    .join(' ');

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 max-[320px]:p-3 sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 bg-arsm-deepest/50 backdrop-blur-sm transition-opacity duration-200"
        aria-label={translate('modal.closeOverlay')}
        onClick={onClose}
      />

      <dialog
        ref={dialogRef}
        open
        aria-labelledby={titleId}
        aria-modal="true"
        tabIndex={-1}
        className={`arsm-modal-dialog relative w-[95%] sm:w-full ${resolvedWidthClassName} ${dialogFitClass} overflow-hidden rounded-2xl border-[2.5px] border-arsm-primary/60 bg-ui-card p-5 text-ui-text transition-[background-color,border-color,color,opacity,transform] duration-200 max-[320px]:p-3.5 dark:border-arsm-border-dark sm:p-6 ${feedbackFrameClass}`}
      >
        <div className={`mb-4 min-w-0 ${fitViewport ? 'shrink-0' : ''} ${isConfirmVariant ? 'relative flex min-h-11 items-center justify-center' : 'flex items-center justify-between gap-3'}`}>
          <h2 id={titleId} className={`min-w-0 ${isConfirmVariant ? 'break-words px-12 text-center text-xl font-semibold [overflow-wrap:anywhere] sm:text-2xl' : 'text-lg font-semibold [overflow-wrap:anywhere]'}`}>{title}</h2>
          {showCloseButton && (
            <div className={isConfirmVariant ? 'absolute right-0 top-0 shrink-0' : 'shrink-0'}>
              <ModalCloseButton onClick={onClose} />
            </div>
          )}
        </div>

        <div className={bodyClasses}>{children}</div>
        {footer && (
          <div className={footerClasses}>
            {footer}
          </div>
        )}
      </dialog>
    </div>,
    document.body,
  );
});
