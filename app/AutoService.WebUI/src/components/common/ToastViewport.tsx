/**
 * App-wide toast notification viewport.
 * Renders top-center auto-dismissing success/error/warning toasts with i18n keys.
 * @module ToastViewport
 */
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, X } from 'lucide-react';
import { SYSTEM_ERROR_TOAST_KEYS, WARNING_TOAST_KEYS } from '../../store/toast.keys';
import { useToastStore, type ToastMessage } from '../../store/toast.store';

interface ToastItemProps {
  readonly toast: ToastMessage;
}

/**
 * Renders a single toast row and owns its auto-dismiss lifecycle timer.
 */
const ToastItem = memo(function ToastItem({ toast }: ToastItemProps) {
  const { t: translate } = useTranslation();
  const removeToast = useToastStore((state) => state.removeToast);

  const isSystemErrorToast = toast.variant === 'error'
    && SYSTEM_ERROR_TOAST_KEYS.has(toast.messageKey);
  const isWarningToast = toast.variant === 'warning'
    || WARNING_TOAST_KEYS.has(toast.messageKey);

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      removeToast(toast.id);
    }, toast.durationMs);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [removeToast, toast.durationMs, toast.id]);

  let toastVariantClass = 'border-arsm-error-border bg-arsm-error-bg text-arsm-error-text dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light';

  if (toast.variant === 'success') {
    toastVariantClass = 'border-arsm-success-border bg-arsm-success-bg text-arsm-success-text dark:border-arsm-success-border-dark dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark';
  } else if (isWarningToast) {
    toastVariantClass = 'border-arsm-warning-border bg-arsm-warning-bg text-arsm-warning-text dark:border-arsm-warning-border-dark dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark';
  } else if (isSystemErrorToast) {
    toastVariantClass = 'border-arsm-error-border bg-arsm-error-bg text-arsm-error-text ring-1 ring-arsm-error-hover/35 dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:ring-arsm-error-dark/45';
  }

  return (
    <output
      aria-live="polite"
      className={`toast-enter pointer-events-auto relative flex min-w-0 w-[min(92vw,33rem)] items-center gap-2 overflow-hidden rounded-2xl border px-4 py-3 text-sm font-medium backdrop-blur-md ${toastVariantClass}`}
    >
      {isSystemErrorToast ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1.5 bg-arsm-error-accent dark:bg-arsm-error-muted"
        />
      ) : null}

      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
        {toast.variant === 'success' ? <Check className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
      </span>

      <p className="min-w-0 flex-1 truncate whitespace-nowrap leading-5">{translate(toast.messageKey, toast.messageValues)}</p>

      {isSystemErrorToast ? (
        <span className="shrink-0 rounded-md border border-arsm-error-hover/45 bg-arsm-card/55 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-arsm-error-text dark:border-arsm-error-dark dark:bg-arsm-card-dark/55 dark:text-arsm-error-softest">
          500
        </span>
      ) : null}

      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md opacity-80 transition-[opacity,transform] duration-150 ease-out hover:scale-105 hover:opacity-100 motion-reduce:transform-none"
        aria-label={translate('toast.dismiss')}
      >
        <X className="h-4 w-4" />
      </button>
    </output>
  );
});

ToastItem.displayName = 'ToastItem';

/**
 * Hosts the global top-center toast stack with pointer-safe overlay behavior.
 */
const ToastViewportComponent = memo(function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[120] flex min-w-0 justify-center px-3 sm:px-4">
      <div className="flex min-w-0 max-w-[calc(100vw-1.5rem)] flex-col items-center gap-2 sm:max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
});

ToastViewportComponent.displayName = 'ToastViewport';

export const ToastViewport = ToastViewportComponent;