import { useCallback, useState } from 'react';

/** Identifies the customer or vehicle currently shown in the details side panel. */
export type CustomerDetailsPanelTarget =
  | { readonly kind: 'customer'; readonly customerId: number }
  | { readonly kind: 'vehicle'; readonly customerId: number; readonly vehicleId: number };

/** Holds which customer or vehicle the details panel shows; its repair history loads where it is rendered. */
export function useCustomerDetailsPanel() {
  const [target, setTarget] = useState<CustomerDetailsPanelTarget | null>(null);

  const openCustomerPanel = useCallback((customerId: number) => {
    setTarget({ kind: 'customer', customerId });
  }, []);

  const openVehiclePanel = useCallback((customerId: number, vehicleId: number) => {
    setTarget((current) => {
      const isSameVehicleSelected = current?.kind === 'vehicle'
        && current.customerId === customerId
        && current.vehicleId === vehicleId;

      return isSameVehicleSelected
        ? { kind: 'customer', customerId }
        : { kind: 'vehicle', customerId, vehicleId };
    });
  }, []);

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
