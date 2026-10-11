/** Combined Parts/Labor types mutation hook: composes the independent sub-hooks, like `useVehicleMutations`. */
import type { CatalogMutationToastHandlers } from './mutation-toast.types';
import { usePartMutations } from './usePartMutations';
import { useLaborTypeMutations } from './useLaborTypeMutations';

/** Encapsulates part and labor-type create/update/delete modal state and mutation side effects. */
export function useCatalogMutations(toastHandlers: CatalogMutationToastHandlers) {
  const partMutations = usePartMutations(toastHandlers);
  const laborTypeMutations = useLaborTypeMutations(toastHandlers);

  return {
    ...partMutations,
    ...laborTypeMutations,
  };
}
