/** Shared toast handler typings for Customers mutation hooks. */

type CustomerMutationToastHandler = (messageKey: string) => void;

export interface CustomerMutationToastHandlers {
  showSuccessToast: CustomerMutationToastHandler;
  showErrorToast: CustomerMutationToastHandler;
}

export interface CustomerMutationToastHandlersWithWarning extends CustomerMutationToastHandlers {
  showWarningToast: CustomerMutationToastHandler;
}
