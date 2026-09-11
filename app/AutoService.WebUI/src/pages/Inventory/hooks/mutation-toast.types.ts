/**
 * Shared toast handler typings for Inventory mutation hooks.
 * @module pages/Inventory/hooks/mutation-toast.types
 */

/** Minimal toast callback shape used by Inventory mutation flows. */
export type CatalogMutationToastHandler = (messageKey: string) => void;

/** Success, error, and warning toast handlers shared by part/labor-type mutation hooks. */
export interface CatalogMutationToastHandlers {
  showSuccessToast: CatalogMutationToastHandler;
  showErrorToast: CatalogMutationToastHandler;
  showWarningToast: CatalogMutationToastHandler;
}
