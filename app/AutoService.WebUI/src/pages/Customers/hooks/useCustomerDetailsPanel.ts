import { useCallback, useState } from 'react';

/** Identifies the customer or vehicle currently shown in the details side panel. */
export type CustomerDetailsPanelTarget =
  | { readonly kind: 'customer'; readonly customerId: number }
  | { readonly kind: 'vehicle'; readonly customerId: number; readonly vehicleId: number };

interface UseCustomerDetailsPanelParams {
  readonly loadCustomerHistory: (customerId: number, force?: boolean) => Promise<void>;
  readonly loadVehicleHistory: (vehicleId: number, force?: boolean) => Promise<void>;
}

/** Coordinates details-panel target state with lazy repair-history loading. */
export function useCustomerDetailsPanel({
  loadCustomerHistory,
  loadVehicleHistory,
}: UseCustomerDetailsPanelParams) {
  const [target, setTarget] = useState<CustomerDetailsPanelTarget | null>(null);

  const openCustomerPanel = useCallback((customerId: number) => {
    setTarget({ kind: 'customer', customerId });
    void loadCustomerHistory(customerId);
  }, [loadCustomerHistory]);

  const openVehiclePanel = useCallback((customerId: number, vehicleId: number) => {
    const isSameVehicleSelected = target?.kind === 'vehicle'
      && target.customerId === customerId
      && target.vehicleId === vehicleId;

    if (isSameVehicleSelected) {
      setTarget({ kind: 'customer', customerId });
      void loadCustomerHistory(customerId);
      return;
    }

    setTarget({ kind: 'vehicle', customerId, vehicleId });
    void loadVehicleHistory(vehicleId);
  }, [loadCustomerHistory, loadVehicleHistory, target]);

  const closePanel = useCallback(() => {
    setTarget(null);
  }, []);

  return {
    target,
    openCustomerPanel,
    openVehiclePanel,
    closePanel,
  };
}