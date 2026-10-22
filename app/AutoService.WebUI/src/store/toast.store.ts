/** Global toast queue for {@link ToastViewport}; messages store i18n keys so toasts update instantly on language change. */

import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  messageKey: string;
  messageValues?: Record<string, string | number> | undefined;
  /** Auto-dismiss duration in milliseconds. */
  durationMs: number;
}

interface ToastState {
  toasts: ToastMessage[];
  /** Enqueues a toast with the given options. Returns the toast ID. */
  showToast: (toast: Omit<ToastMessage, 'id' | 'durationMs'> & { durationMs?: number | undefined }) => string;
  /** Shorthands for `showToast` with a fixed variant; each returns the toast ID. */
  showSuccess: (messageKey: string, messageValues?: Record<string, string | number>, durationMs?: number) => string;
  showError: (messageKey: string, messageValues?: Record<string, string | number>, durationMs?: number) => string;
  showWarning: (messageKey: string, messageValues?: Record<string, string | number>, durationMs?: number) => string;
  removeToast: (id: string) => void;
}

/** Default auto-dismiss duration for toasts (5 seconds). */
const DEFAULT_TOAST_DURATION_MS = 5000;

/** Error toasts stay twice as long (10 seconds), because they usually have to be read and acted on. */
const ERROR_TOAST_DURATION_MS = 10_000;

/** Generates a unique toast ID using `crypto.randomUUID` when available, else a timestamp-based one. */
function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Zustand store for toasts; each row of {@link ToastViewport} dismisses itself after {@link ToastMessage.durationMs}. */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  showToast: ({ variant, messageKey, messageValues, durationMs }) => {
    const id = createToastId();

    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          variant,
          messageKey,
          messageValues,
          durationMs: durationMs ?? (variant === 'error' ? ERROR_TOAST_DURATION_MS : DEFAULT_TOAST_DURATION_MS),
        },
      ],
    }));

    return id;
  },
  showSuccess: (messageKey, messageValues, durationMs) =>
    get().showToast({ variant: 'success', messageKey, messageValues, durationMs }),
  showError: (messageKey, messageValues, durationMs) =>
    get().showToast({ variant: 'error', messageKey, messageValues, durationMs }),
  showWarning: (messageKey, messageValues, durationMs) =>
    get().showToast({ variant: 'warning', messageKey, messageValues, durationMs }),
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));

/** Empties the queue (logout calls it); the rows unmount and their dismiss timers stop with them. */
export function clearToasts(): void {
  useToastStore.setState({ toasts: [] });
}
