import type { MockApiState } from './test-data';

/** Mirrors the backend's display-only gross formula (plan F1, `Pricing/PricingCalculator.GrossUnitPrice`). */
export function computeGrossAmount(netAmount: number, vatRatePercent: number): number {
  return Math.round(netAmount * (1 + vatRatePercent / 100) * 100) / 100;
}

/** Resolves the gross for a create/update response, consuming a one-shot `state.catalogGrossOverride`
 * so a spec can prove the row renders the server's gross value instead of recomputing it locally. */
export function resolveGrossAmount(state: MockApiState, netAmount: number, vatRatePercent: number): number {
  if (state.catalogGrossOverride !== null) {
    const override = state.catalogGrossOverride;
    state.catalogGrossOverride = null;
    return override;
  }

  return computeGrossAmount(netAmount, vatRatePercent);
}
