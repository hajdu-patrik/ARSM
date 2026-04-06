import { create } from 'zustand';

export type ToastVariant = 'success' | 'error';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  messageKey: string;
  messageValues?: Record<string, string | number>;
  durationMs: number;
}

interface ToastState {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  showSuccess: (messageKey: string, messageValues?: Record<string, string | number>, durationMs?: number) => string;
  showError: (messageKey: string, messageValues?: Record<string, string | number>, durationMs?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const DEFAULT_TOAST_DURATION_MS = 5000;

function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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
          durationMs: durationMs ?? DEFAULT_TOAST_DURATION_MS,
        },
      ],
    }));

    return id;
  },
  showSuccess: (messageKey, messageValues, durationMs) =>
    get().showToast({ variant: 'success', messageKey, messageValues, durationMs }),
  showError: (messageKey, messageValues, durationMs) =>
    get().showToast({ variant: 'error', messageKey, messageValues, durationMs }),
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
  clearToasts: () => set({ toasts: [] }),
}));
