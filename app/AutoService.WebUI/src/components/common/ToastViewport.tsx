/**
 * App-wide toast notification viewport. Renders a fixed overlay of
 * auto-dismissing success/error toasts with i18n-resolved messages.
 * Toast messages store i18n keys so visible toasts update on language change.
 * @module ToastViewport
 */
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, X } from 'lucide-react';
import { useToastStore, type ToastMessage } from '../../store/toast.store';

const SYSTEM_ERROR_TOAST_KEYS = new Set([
  'login.serverError500',
  'login.databaseUnavailable',
]);

/** Props for the internal {@link ToastItem} component. */
interface ToastItemProps {
  /** The toast message data to render. */
  readonly toast: ToastMessage;
}

/** Single toast notification with auto-dismiss timer, variant styling, and manual dismiss button. */
const ToastItem = memo(function ToastItem({ toast }: ToastItemProps) {
  const { t } = useTranslation();
  const removeToast = useToastStore((state) => state.removeToast);
  const isSystemErrorToast = toast.variant === 'error' && SYSTEM_ERROR_TOAST_KEYS.has(toast.messageKey);

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
  } else if (isSystemErrorToast) {
    toastVariantClass = 'border-arsm-error-border bg-arsm-error-bg text-arsm-error-text ring-1 ring-arsm-error-hover/35 dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:ring-arsm-error-dark/45';
  }

  return (
    <output
      aria-live="polite"
      className={`toast-enter pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-[0_16px_40px_rgba(18,14,34,0.28),0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-md ${toastVariantClass}`}
    >
      {isSystemErrorToast ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1.5 bg-arsm-error-accent dark:bg-arsm-error-muted"
        />
      ) : null}

      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {toast.variant === 'success' ? (
          <Check className="h-5 w-5" />
        ) : (
          <CircleAlert className="h-5 w-5" />
        )}
      </span>

      <p className="flex-1 leading-5">
        {t(toast.messageKey, toast.messageValues)}
      </p>

      {isSystemErrorToast ? (
        <span className="rounded-md border border-arsm-error-hover/45 bg-white/55 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-arsm-error-text dark:border-arsm-error-dark dark:bg-white/10 dark:text-arsm-error-softest">
          500
        </span>
      ) : null}

      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="rounded-md p-1 opacity-80 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/12"
        aria-label={t('toast.dismiss')}
      >
        <X className="h-4 w-4" />
      </button>
    </output>
  );
});

ToastItem.displayName = 'ToastItem';

/** Fixed-position container that renders all active toasts at the top of the viewport. */
const ToastViewportComponent = memo(function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[120] flex justify-center px-3 sm:px-4">
      <div className="flex w-full max-w-md flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
});

ToastViewportComponent.displayName = 'ToastViewport';

export const ToastViewport = ToastViewportComponent;
