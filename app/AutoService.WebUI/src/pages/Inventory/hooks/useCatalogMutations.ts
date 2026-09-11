/**
 * Combined Parts and Labor types mutation hook for the Inventory page.
 * Composes the independent part and labor-type mutation hooks, mirroring
 * how `useVehicleMutations` composes its form/delete sub-hooks.
 * @module pages/Inventory/hooks/useCatalogMutations
 */
import type { Dispatch, SetStateAction } from 'react';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import type { CatalogMutationToastHandlers } from './mutation-toast.types';
import { usePartMutations } from './usePartMutations';
import { useLaborTypeMutations } from './useLaborTypeMutations';

/** External dependencies required by the combined catalog mutation hooks. */
interface UseCatalogMutationsParams extends CatalogMutationToastHandlers {
  setParts: Dispatch<SetStateAction<PartDto[]>>;
  reloadParts: (force?: boolean) => Promise<void>;
  setLaborTypes: Dispatch<SetStateAction<LaborTypeDto[]>>;
  reloadLaborTypes: (force?: boolean) => Promise<void>;
}

/**
 * Encapsulates part and labor-type create/update/delete modal state and mutation side effects.
 * @param params Shared list setters, list reloaders, and localized toast handlers.
 * @returns Combined modal state and actions for both catalog entities.
 */
export function useCatalogMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  setParts,
  reloadParts,
  setLaborTypes,
  reloadLaborTypes,
}: UseCatalogMutationsParams) {
  const partMutations = usePartMutations({
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    setParts,
    reloadParts,
  });

  const laborTypeMutations = useLaborTypeMutations({
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    setLaborTypes,
    reloadLaborTypes,
  });

  return {
    ...partMutations,
    ...laborTypeMutations,
  };
}
