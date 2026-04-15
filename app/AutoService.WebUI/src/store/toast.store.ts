/**
 * Global toast notification store.
 *
 * Manages a queue of toast messages displayed via {@link ToastViewport}.
 * Toast messages store i18n keys (not resolved strings) so that visible
 * toasts update instantly when language or theme changes.
 * @module store/toast.store
 */

import { create } from 'zustand';

/** Visual style variant for a toast notification. */
export type ToastVariant = 'success' | 'error';

/**
 * A single toast notification entry in the queue.
 */
export interface ToastMessage {
  /** Unique identifier for this toast instance. */
  id: string;
  /** Visual variant (success or error). */
  variant: ToastVariant;
  /** i18n translation key for the message text. */
  messageKey: string;
  /** Optional interpolation values for the i18n key. */
  messageValues?: Record<string, string | number>;
  /** Auto-dismiss duration in milliseconds. */
  durationMs: number;
}

/**
 * Shape of the toast Zustand store.
 */
interface ToastState {
  /** Active toast messages in display order. */
  toasts: ToastMessage[];
  /** Enqueues a toast with the given options. Returns the toast ID. */
  showToast: (toast: Omit<ToastMessage, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  /** Shorthand to show a success toast. Returns the toast ID. */
  showSuccess: (messageKey: string, messageValues?: Record<string, string | number>, durationMs?: number) => string;
  /** Shorthand to show an error toast. Returns the toast ID. */
  showError: (messageKey: string, messageValues?: Record<string, string | number>, durationMs?: number) => string;
  /** Removes a specific toast by ID. */
  removeToast: (id: string) => void;
  /** Clears all active toasts. */
  clearToasts: () => void;
}

/** Default auto-dismiss duration for toasts (5 seconds). */
const DEFAULT_TOAST_DURATION_MS = 5000;

/**
 * Generates a unique toast ID using {@code crypto.randomUUID} when available,
 * falling back to a timestamp-based identifier.
 * @returns A unique string identifier.
 */
function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Zustand store for the global toast notification system.
 * Toasts are auto-dismissed by {@link ToastViewport} based on {@link ToastMessage.durationMs}.
 */
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
