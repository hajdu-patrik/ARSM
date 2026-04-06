import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore, type ToastMessage } from '../../store/toast.store';

interface ToastItemProps {
  readonly toast: ToastMessage;
}

const ToastItem = memo(function ToastItem({ toast }: ToastItemProps) {
  const { t } = useTranslation();
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      removeToast(toast.id);
    }, toast.durationMs);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [removeToast, toast.durationMs, toast.id]);

  const toastVariantClass =
    toast.variant === 'success'
      ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
      : 'border-[#F4C8CB] bg-[#FDF2F3] text-[#C13C45] dark:border-[#6A2D33] dark:bg-[#2B171A] dark:text-[#FF9AA0]';

  return (
    <output
      aria-live="polite"
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-[0_10px_28px_rgba(44,36,64,0.2)] backdrop-blur ${toastVariantClass}`}
    >
      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {toast.variant === 'success' ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 6.75h.008v.008H12v-.008z" />
          </svg>
        )}
      </span>

      <p className="flex-1 leading-5">
        {t(toast.messageKey, toast.messageValues)}
      </p>

      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="rounded-md p-1 opacity-80 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
        aria-label={t('toast.dismiss')}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </output>
  );
});

ToastItem.displayName = 'ToastItem';

const ToastViewportComponent = memo(function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-3 sm:px-4">
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
