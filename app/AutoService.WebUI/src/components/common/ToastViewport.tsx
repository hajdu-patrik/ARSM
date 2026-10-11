/** App-wide toast notification viewport: a persistent polite live region that stacks the
 * auto-dismissing success/error/warning toasts, whose countdown pauses on hover and focus. */
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, X } from 'lucide-react';
import { SYSTEM_ERROR_TOAST_KEYS, WARNING_TOAST_KEYS } from '../../store/toast.keys';
import { useToastStore, type ToastMessage } from '../../store/toast.store';
import { defaultIconClass, feedbackFrameClass, focusVisibleOutlineClass, largeIconClass, toneFeedbackClasses } from '../../utils/formStyles';

/** Props for a single toast row. */
interface ToastItemProps {
  readonly toast: ToastMessage;
}

/** Resolves the tone and frame classes for a toast: success/warning map to their tone, a system (5xx)
 * error swaps the shared frame for an emphasis outline, other errors use the plain error tone. */
function resolveToastVariantClass(
  variant: ToastMessage['variant'],
  isWarningToast: boolean,
  isSystemErrorToast: boolean,
): string {
  if (variant === 'success') {
    return `${toneFeedbackClasses.success} ${feedbackFrameClass}`;
  }

  if (isWarningToast) {
    return `${toneFeedbackClasses.warning} ${feedbackFrameClass}`;
  }

  if (isSystemErrorToast) {
    return `${toneFeedbackClasses.error} outline-2 outline-arsm-error-hover/35 dark:outline-arsm-error-dark/45`;
  }

  return `${toneFeedbackClasses.error} ${feedbackFrameClass}`;
}

/** Counts a toast down to its removal; while `isPaused` the countdown stops and later resumes with the time left. */
function useAutoDismiss(toast: ToastMessage, isPaused: boolean, onExpire: (id: string) => void): void {
  const remainingMsRef = useRef(toast.durationMs);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const startedAt = Date.now();
    const timeoutId = globalThis.setTimeout(() => {
      onExpire(toast.id);
    }, remainingMsRef.current);

    return () => {
      globalThis.clearTimeout(timeoutId);
      remainingMsRef.current = Math.max(0, remainingMsRef.current - (Date.now() - startedAt));
    };
  }, [isPaused, onExpire, toast.id]);
}

/** Renders a single toast row: wrapped text, a dismiss button, and a countdown that waits while it is hovered or focused. */
const ToastItem = memo(function ToastItem({ toast }: ToastItemProps) {
  const { t: translate } = useTranslation();
  const removeToast = useToastStore((state) => state.removeToast);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  const isErrorToast = toast.variant === 'error';
  const isSystemErrorToast = isErrorToast && SYSTEM_ERROR_TOAST_KEYS.has(toast.messageKey);
  const isWarningToast = toast.variant === 'warning'
    || WARNING_TOAST_KEYS.has(toast.messageKey);

  useAutoDismiss(toast, isHovered || hasFocus, removeToast);

  const toastVariantClass = resolveToastVariantClass(toast.variant, isWarningToast, isSystemErrorToast);
  const message = toast.messageValues === undefined
    ? translate(toast.messageKey)
    : translate(toast.messageKey, toast.messageValues);

  return (
    <div
      className={`toast-enter pointer-events-auto relative flex min-w-0 w-[min(92vw,33rem)] items-center gap-2 overflow-hidden rounded-2xl border px-4 py-3 text-sm font-medium backdrop-blur-md ${toastVariantClass}`}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') {
          setIsHovered(true);
        }
      }}
      onPointerLeave={() => {
        setIsHovered(false);
      }}
      onFocus={() => {
        setHasFocus(true);
      }}
      onBlur={(event) => {
        if (event.relatedTarget === null || !event.currentTarget.contains(event.relatedTarget)) {
          setHasFocus(false);
        }
      }}
    >
      {isSystemErrorToast ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1.5 bg-arsm-error-accent dark:bg-arsm-error-muted"
        />
      ) : null}

      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
        {toast.variant === 'success' ? <Check className={largeIconClass} /> : <CircleAlert className={largeIconClass} />}
      </span>

      <p
        role={isErrorToast ? 'alert' : undefined}
        className="min-w-0 flex-1 leading-5 [overflow-wrap:anywhere]"
      >
        {message}
      </p>

      {isSystemErrorToast ? (
        <span className="shrink-0 rounded-md border border-arsm-error-hover/45 bg-ui-card/55 px-1.5 py-0.5 text-xs font-bold tracking-wide text-arsm-error-text dark:border-arsm-error-dark dark:text-arsm-error-softest">
          500
        </span>
      ) : null}

      <button
        type="button"
        onClick={() => {
          removeToast(toast.id);
        }}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md opacity-80 transition-[opacity,transform] duration-150 ease-out hover:scale-105 hover:opacity-100 focus-visible:opacity-100 motion-reduce:hover:scale-100 ${focusVisibleOutlineClass}`}
        aria-label={translate('toast.dismiss')}
      >
        <X className={defaultIconClass} />
      </button>
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

/** Hosts the global top-center toast stack; the polite live region stays mounted while the stack is empty,
 * so each added toast is announced (an error toast's message also carries role="alert"). */
const ToastViewportComponent = memo(function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <output
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-5 z-[120] flex min-w-0 justify-center px-3 sm:px-4"
    >
      <div className="flex min-w-0 max-w-[calc(100vw-1.5rem)] flex-col items-center gap-2 sm:max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </output>
  );
});

ToastViewportComponent.displayName = 'ToastViewport';

/** Memoized global toast viewport; its live region is always mounted, empty while there are no toasts. */
export const ToastViewport = ToastViewportComponent;
