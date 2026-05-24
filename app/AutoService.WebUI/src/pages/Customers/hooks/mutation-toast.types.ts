/**
 * Shared toast handler typings for Customers mutation hooks.
 * @module pages/Customers/hooks/mutation-toast.types
 */

/** Minimal toast callback shape used by Customers mutation flows. */
export type CustomerMutationToastHandler = (messageKey: string) => void;

/** Standard success+error toast handlers for mutation hooks. */
export interface CustomerMutationToastHandlers {
  showSuccessToast: CustomerMutationToastHandler;
  showErrorToast: CustomerMutationToastHandler;
}

/** Extended toast handlers for flows that emit warning messages. */
export interface CustomerMutationToastHandlersWithWarning extends CustomerMutationToastHandlers {
  showWarningToast: CustomerMutationToastHandler;
}
